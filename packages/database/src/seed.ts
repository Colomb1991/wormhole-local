/**
 * Seed del database — Ristorante Cinese "Al Mare" (Livorno).
 *
 * Popola/aggiorna il tenant `cinese-usdt` con il menu reale (vedi
 * `docs/menu-reale.md` e `seed-menu.ts`), i CAP di Livorno e (in dev) un
 * customer di test.
 *
 * Idempotente per riconciliazione, non per semplice "skip se esiste":
 *  - Tenant: upsert per slug (i dati anagrafici vengono aggiornati a ogni run).
 *  - Categorie: upsert per nome; le categorie obsolete (placeholder) vengono
 *    rimosse.
 *  - Piatti: upsert per (tenantId, menuNumber); i piatti senza numero o non più
 *    presenti nel menu (placeholder) vengono rimossi.
 *  - Disponibilità (`isAvailable`): impostata solo all'inserimento, MAI
 *    sovrascritta su update — così i toggle "esaurito" del titolare sopravvivono
 *    a un nuovo seed.
 *
 * Esecuzione: `pnpm db:seed`
 */
import 'dotenv/config'
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { and, eq, inArray } from 'drizzle-orm'
import { hashPassword } from '@wormhole/core/auth/password'

import { MENU_CATEGORIES, MENU_ITEMS } from './seed-menu'

// Carica .env.local dalla root prima di importare il client.
config({ path: resolve(process.cwd(), '../../.env.local') })

const {
  db,
  tenants,
  menuCategories,
  menuItems,
  tenantPostalCodes,
  customers,
  orderSequences,
  tenantPauseState,
  users,
  tenantUsers,
} = await import('./index')

const TENANT_SLUG = 'cinese-usdt'

/** Dati anagrafici del ristorante reale (da `docs/menu-reale.md`). */
const RESTAURANT = {
  name: 'Al Mare — Ristorante Cinese',
  address: 'Corso Mazzini 341', // numero civico da confermare con la titolare
  postalCode: '57126',
  city: 'Livorno',
  // Telefono fisso 0586.80.72.82 → E.164. (Cellulare 328.06.36.863 in tagline.)
  phone: '+390586807282',
  tagline: 'Cinese • Delivery & Take Away • Livorno • tel. 0586 807282',
} as const

async function main() {
  console.info('🌱 Seed Wormhole Local — inizio')

  // ----------------------------------------------------------------------
  // Tenant (upsert per slug)
  // ----------------------------------------------------------------------
  const existingTenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, TENANT_SLUG),
  })

  let tenantId: string

  if (existingTenant) {
    tenantId = existingTenant.id
    await db
      .update(tenants)
      .set({
        name: RESTAURANT.name,
        address: RESTAURANT.address,
        postalCode: RESTAURANT.postalCode,
        city: RESTAURANT.city,
        phone: RESTAURANT.phone,
        tagline: RESTAURANT.tagline,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))
    console.info(`✓ Tenant "${TENANT_SLUG}" aggiornato (${tenantId})`)
  } else {
    const [created] = await db
      .insert(tenants)
      .values({
        slug: TENANT_SLUG,
        name: RESTAURANT.name,
        address: RESTAURANT.address,
        postalCode: RESTAURANT.postalCode,
        city: RESTAURANT.city,
        country: 'IT',
        // Coordinate approssimate di Corso Mazzini, Livorno.
        // Da raffinare con `scripts/distances-matrix.ts` (Nominatim).
        latitude: '43.5453',
        longitude: '10.3163',
        phone: RESTAURANT.phone,
        email: 'placeholder@example.com',
        logoUrl: null,
        brandColor: '#00A893',
        tagline: RESTAURANT.tagline,
        status: 'active',
        config: {
          slotDurationMinutes: 30,
          deliveryWindowStart: '19:00',
          deliveryWindowEnd: '22:00',
          weeklySchedule: {
            monday: { isOpen: true, riderCount: 1, ordersPerSlot: 3 },
            tuesday: { isOpen: false, riderCount: 0, ordersPerSlot: 0 },
            wednesday: { isOpen: true, riderCount: 1, ordersPerSlot: 3 },
            thursday: { isOpen: true, riderCount: 1, ordersPerSlot: 3 },
            friday: { isOpen: true, riderCount: 2, ordersPerSlot: 5 },
            saturday: { isOpen: true, riderCount: 2, ordersPerSlot: 5 },
            sunday: { isOpen: true, riderCount: 2, ordersPerSlot: 5 },
          },
          minOrderAmountCents: 1000,
          maxCashChangeCents: 5000,
          defaultPrepTimeMinutes: 10,
          prepTimeBufferPerItem: 1,
          paymentMethods: ['cash'],
          notifyOwnerOnNewOrder: true,
          notifyCustomerOnStatus: true,
          pendingOrderTimeoutMinutes: 5,
          customerCancellationWindowMinutes: 2,
        },
      })
      .returning()

    if (!created) throw new Error('Failed to create tenant')
    tenantId = created.id

    // Inizializza pause_state e order_sequences
    await db.insert(tenantPauseState).values({ tenantId, isPaused: false })
    await db.insert(orderSequences).values({ tenantId, lastOrderNumber: 0 })

    console.info(`✓ Tenant "${TENANT_SLUG}" creato (${tenantId})`)
  }

  // ----------------------------------------------------------------------
  // Categorie (upsert per nome, rimozione obsolete)
  // ----------------------------------------------------------------------
  const existingCategories = await db.query.menuCategories.findMany({
    where: eq(menuCategories.tenantId, tenantId),
  })
  const existingCatByName = new Map(existingCategories.map((c) => [c.name, c]))
  const desiredCatNames = new Set(MENU_CATEGORIES.map((c) => c.name))
  const categoryIdByName = new Map<string, string>()

  let catCreated = 0
  let catUpdated = 0
  for (const cat of MENU_CATEGORIES) {
    const existing = existingCatByName.get(cat.name)
    if (existing) {
      await db
        .update(menuCategories)
        .set({ sortOrder: cat.sortOrder, isActive: true, updatedAt: new Date() })
        .where(eq(menuCategories.id, existing.id))
      categoryIdByName.set(cat.name, existing.id)
      catUpdated++
    } else {
      const [created] = await db
        .insert(menuCategories)
        .values({ tenantId, name: cat.name, sortOrder: cat.sortOrder })
        .returning()
      if (!created) throw new Error(`Failed to create category ${cat.name}`)
      categoryIdByName.set(cat.name, created.id)
      catCreated++
    }
  }
  console.info(`✓ Categorie: ${catCreated} create, ${catUpdated} aggiornate (${desiredCatNames.size} totali)`)

  // ----------------------------------------------------------------------
  // Piatti (upsert per menuNumber, rimozione obsoleti/placeholder)
  // ----------------------------------------------------------------------
  // Prep time di default per categoria.
  const prepByCategory = new Map(MENU_CATEGORIES.map((c) => [c.name, c.defaultPrepMinutes]))

  const existingItems = await db.query.menuItems.findMany({
    where: eq(menuItems.tenantId, tenantId),
  })
  const existingItemByNumber = new Map(
    existingItems.filter((i) => i.menuNumber != null).map((i) => [i.menuNumber as string, i])
  )

  let itemCreated = 0
  let itemUpdated = 0
  // sortOrder progressivo dentro ogni categoria.
  const sortCounters = new Map<string, number>()

  for (const item of MENU_ITEMS) {
    const categoryId = categoryIdByName.get(item.category)
    if (!categoryId) throw new Error(`Categoria sconosciuta per piatto ${item.number}: ${item.category}`)
    const nextSort = (sortCounters.get(item.category) ?? 0) + 1
    sortCounters.set(item.category, nextSort)
    const prep = prepByCategory.get(item.category) ?? 10

    const existing = existingItemByNumber.get(item.number)
    if (existing) {
      // Update: NON tocca isAvailable (preserva i toggle "esaurito" del titolare).
      await db
        .update(menuItems)
        .set({
          categoryId,
          name: item.name,
          priceCents: item.priceCents,
          prepTimeMinutes: prep,
          sortOrder: nextSort,
          vatRate: 10,
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(menuItems.id, existing.id))
      itemUpdated++
    } else {
      await db.insert(menuItems).values({
        tenantId,
        categoryId,
        menuNumber: item.number,
        name: item.name,
        description: null,
        priceCents: item.priceCents,
        vatRate: 10,
        prepTimeMinutes: prep,
        sortOrder: nextSort,
        isAvailable: true,
      })
      itemCreated++
    }
  }

  // Rimuovi piatti obsoleti: quelli senza numero (placeholder vecchi) o con un
  // numero non più presente nel menu reale.
  const desiredNumbers = new Set(MENU_ITEMS.map((i) => i.number))
  const obsoleteItemIds = existingItems
    .filter((i) => i.menuNumber == null || !desiredNumbers.has(i.menuNumber))
    .map((i) => i.id)
  if (obsoleteItemIds.length > 0) {
    await db.delete(menuItems).where(inArray(menuItems.id, obsoleteItemIds))
  }

  // Rimuovi categorie obsolete (placeholder) ora che nessun piatto le referenzia.
  const obsoleteCatIds = existingCategories
    .filter((c) => !desiredCatNames.has(c.name))
    .map((c) => c.id)
  if (obsoleteCatIds.length > 0) {
    await db.delete(menuCategories).where(inArray(menuCategories.id, obsoleteCatIds))
  }

  console.info(
    `✓ Piatti: ${itemCreated} creati, ${itemUpdated} aggiornati, ${obsoleteItemIds.length} rimossi; categorie obsolete rimosse: ${obsoleteCatIds.length}`
  )

  // ----------------------------------------------------------------------
  // CAP serviti (Livorno) — upsert per (tenantId, postalCode)
  // ----------------------------------------------------------------------
  const caps = [
    { postalCode: '57121', city: 'Livorno', deliveryFeeCents: 200, zone: 'near' },
    { postalCode: '57122', city: 'Livorno', deliveryFeeCents: 250, zone: 'medium' },
    { postalCode: '57123', city: 'Livorno', deliveryFeeCents: 300, zone: 'far' },
    { postalCode: '57125', city: 'Livorno', deliveryFeeCents: 200, zone: 'near' },
    { postalCode: '57126', city: 'Livorno', deliveryFeeCents: 200, zone: 'near' },
    { postalCode: '57127', city: 'Livorno', deliveryFeeCents: 300, zone: 'far' },
    { postalCode: '57128', city: 'Livorno', deliveryFeeCents: 350, zone: 'far' },
  ]

  const existingCaps = await db.query.tenantPostalCodes.findMany({
    where: eq(tenantPostalCodes.tenantId, tenantId),
  })
  const existingCapSet = new Set(existingCaps.map((c) => c.postalCode))
  const newCaps = caps.filter((c) => !existingCapSet.has(c.postalCode))
  if (newCaps.length > 0) {
    await db.insert(tenantPostalCodes).values(
      newCaps.map((c) => ({
        tenantId,
        postalCode: c.postalCode,
        city: c.city,
        deliveryFeeCents: c.deliveryFeeCents,
        zone: c.zone,
        isServed: true,
      }))
    )
  }
  console.info(`✓ CAP serviti: ${newCaps.length} inseriti, ${existingCaps.length} già presenti`)

  // ----------------------------------------------------------------------
  // Customer di test (solo in dev/staging)
  // ----------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const existingTestCustomer = await db.query.customers.findFirst({
      where: and(eq(customers.tenantId, tenantId), eq(customers.phone, '+393331234567')),
    })

    if (!existingTestCustomer) {
      await db.insert(customers).values({
        tenantId,
        phone: '+393331234567',
        name: 'Mario Rossi',
        email: 'mario@test.it',
        deliveryCode: '1234',
        defaultAddress: {
          street: 'Via Garibaldi 10',
          postalCode: '57125',
          city: 'Livorno',
          buildingNumber: '10',
          floor: 'Piano 2',
          notes: 'Citofono Rossi',
        },
        hasConsentedDataStorage: true,
        consentGivenAt: new Date(),
      })
      console.info('✓ Customer di test creato (Mario Rossi, +393331234567, code 1234)')
    } else {
      console.info('✓ Customer di test già presente')
    }
  }

  // ----------------------------------------------------------------------
  // Utente titolare di test (solo in dev/staging)
  // Login app owner: titolare@almare.test / almare2026
  // ----------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const OWNER_EMAIL = 'titolare@almare.test'
    const existingOwner = await db.query.users.findFirst({
      where: eq(users.email, OWNER_EMAIL),
    })

    let ownerUserId: string
    if (existingOwner) {
      ownerUserId = existingOwner.id
      // Garantisce che la password di test resti valida anche se l'hash
      // cambia formato tra sessioni di sviluppo.
      if (!existingOwner.passwordHash) {
        await db
          .update(users)
          .set({ passwordHash: hashPassword('almare2026'), updatedAt: new Date() })
          .where(eq(users.id, ownerUserId))
        console.info('✓ Password owner di test reimpostata')
      } else {
        console.info('✓ Utente titolare di test già presente')
      }
    } else {
      const [createdOwner] = await db
        .insert(users)
        .values({
          id: randomUUID(),
          email: OWNER_EMAIL,
          fullName: 'Titolare Al Mare (test)',
          role: 'owner',
          passwordHash: hashPassword('almare2026'),
          isActive: true,
        })
        .returning()
      if (!createdOwner) throw new Error('Failed to create owner user')
      ownerUserId = createdOwner.id
      console.info(`✓ Utente titolare di test creato (${OWNER_EMAIL} / almare2026)`)
    }

    const existingLink = await db.query.tenantUsers.findFirst({
      where: and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, ownerUserId)),
    })
    if (!existingLink) {
      await db.insert(tenantUsers).values({ tenantId, userId: ownerUserId, role: 'owner' })
      console.info('✓ Associazione titolare ↔ tenant creata')
    }
  }

  console.info('✅ Seed completato')
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Seed fallito:', err)
  process.exit(1)
})
