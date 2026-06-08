/**
 * Seed iniziale del database.
 *
 * Popola un tenant "cinese-usdt" placeholder con menu di esempio, CAP di
 * Livorno e (in dev) un customer di test. Idempotente: rileva se il tenant
 * esiste già e in quel caso non duplica.
 *
 * Esecuzione: `pnpm db:seed`
 */
import 'dotenv/config'
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { eq } from 'drizzle-orm'

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
} = await import('./index')

const TENANT_SLUG = 'cinese-usdt'

async function main() {
  console.info('🌱 Seed Wormhole Local — inizio')

  // ----------------------------------------------------------------------
  // Tenant
  // ----------------------------------------------------------------------
  const existingTenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, TENANT_SLUG),
  })

  let tenantId: string

  if (existingTenant) {
    console.info(`✓ Tenant "${TENANT_SLUG}" già esistente (${existingTenant.id})`)
    tenantId = existingTenant.id
  } else {
    const [created] = await db
      .insert(tenants)
      .values({
        slug: TENANT_SLUG,
        name: 'Ristorante Cinese USDT',
        address: 'Corso Mazzini 341',
        postalCode: '57126',
        city: 'Livorno',
        country: 'IT',
        // Coordinate approssimate di Corso Mazzini, Livorno
        // Da raffinare con `scripts/distances-matrix.ts` (Nominatim).
        latitude: '43.5453',
        longitude: '10.3163',
        phone: '+39000000000',
        email: 'placeholder@example.com',
        logoUrl: null,
        brandColor: '#00A893',
        tagline: 'Consegna a domicilio • Livorno',
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
  // Menu categories
  // ----------------------------------------------------------------------
  const existingCategories = await db.query.menuCategories.findMany({
    where: eq(menuCategories.tenantId, tenantId),
  })

  let categoriesByName: Record<string, string> = {}
  if (existingCategories.length > 0) {
    categoriesByName = Object.fromEntries(existingCategories.map((c) => [c.name, c.id]))
    console.info(`✓ Categorie già presenti (${existingCategories.length})`)
  } else {
    const categoryData = [
      { name: 'Antipasti', sortOrder: 1 },
      { name: 'Primi', sortOrder: 2 },
      { name: 'Secondi', sortOrder: 3 },
      { name: 'Sushi & Sashimi', sortOrder: 4 },
      { name: 'Riso & Spaghetti', sortOrder: 5 },
      { name: 'Bibite', sortOrder: 6 },
      { name: 'Dolci', sortOrder: 7 },
    ]

    const inserted = await db
      .insert(menuCategories)
      .values(categoryData.map((c) => ({ ...c, tenantId })))
      .returning()

    categoriesByName = Object.fromEntries(inserted.map((c) => [c.name, c.id]))
    console.info(`✓ Create ${inserted.length} categorie`)
  }

  // ----------------------------------------------------------------------
  // Piatti di esempio (placeholder)
  // ----------------------------------------------------------------------
  const existingItems = await db.query.menuItems.findMany({
    where: eq(menuItems.tenantId, tenantId),
  })

  if (existingItems.length === 0) {
    const items = [
      {
        categoryId: categoriesByName['Antipasti'],
        name: 'Ravioli alla piastra (5pz)',
        description: 'Ravioli al maiale alla piastra',
        priceCents: 600,
        prepTimeMinutes: 15,
        sortOrder: 1,
      },
      {
        categoryId: categoriesByName['Antipasti'],
        name: 'Involtini primavera (2pz)',
        description: 'Croccanti involtini con verdure',
        priceCents: 400,
        prepTimeMinutes: 8,
        sortOrder: 2,
      },
      {
        categoryId: categoriesByName['Primi'],
        name: 'Spaghetti di soia con verdure',
        description: 'Spaghetti di soia saltati con verdure miste',
        priceCents: 550,
        prepTimeMinutes: 5,
        sortOrder: 1,
      },
      {
        categoryId: categoriesByName['Riso & Spaghetti'],
        name: 'Riso alla cantonese',
        description: 'Riso saltato con prosciutto, uova, piselli',
        priceCents: 600,
        prepTimeMinutes: 8,
        sortOrder: 1,
      },
      {
        categoryId: categoriesByName['Secondi'],
        name: 'Pollo con mandorle',
        description: 'Pollo croccante saltato con mandorle',
        priceCents: 900,
        prepTimeMinutes: 12,
        sortOrder: 1,
      },
      {
        categoryId: categoriesByName['Secondi'],
        name: 'Maiale in agrodolce',
        description: 'Maiale fritto con salsa agrodolce',
        priceCents: 950,
        prepTimeMinutes: 12,
        sortOrder: 2,
      },
      {
        categoryId: categoriesByName['Bibite'],
        name: 'Coca-Cola 33cl',
        description: null,
        priceCents: 250,
        vatRate: 22,
        prepTimeMinutes: 1,
        sortOrder: 1,
      },
      {
        categoryId: categoriesByName['Dolci'],
        name: 'Banane fritte',
        description: 'Banane in tempura con miele',
        priceCents: 400,
        prepTimeMinutes: 6,
        sortOrder: 1,
      },
    ]

    await db.insert(menuItems).values(
      items.map((item) => ({
        tenantId,
        categoryId: item.categoryId,
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
        vatRate: item.vatRate ?? 10,
        prepTimeMinutes: item.prepTimeMinutes,
        sortOrder: item.sortOrder,
        isAvailable: true,
      }))
    )

    console.info(`✓ Creati ${items.length} piatti di esempio`)
  } else {
    console.info(`✓ Piatti già presenti (${existingItems.length})`)
  }

  // ----------------------------------------------------------------------
  // CAP serviti (Livorno placeholder)
  // ----------------------------------------------------------------------
  const existingCaps = await db.query.tenantPostalCodes.findMany({
    where: eq(tenantPostalCodes.tenantId, tenantId),
  })

  if (existingCaps.length === 0) {
    const caps = [
      { postalCode: '57121', city: 'Livorno', deliveryFeeCents: 200, zone: 'near' },
      { postalCode: '57122', city: 'Livorno', deliveryFeeCents: 250, zone: 'medium' },
      { postalCode: '57123', city: 'Livorno', deliveryFeeCents: 300, zone: 'far' },
      { postalCode: '57125', city: 'Livorno', deliveryFeeCents: 200, zone: 'near' },
      { postalCode: '57126', city: 'Livorno', deliveryFeeCents: 200, zone: 'near' },
      { postalCode: '57127', city: 'Livorno', deliveryFeeCents: 300, zone: 'far' },
      { postalCode: '57128', city: 'Livorno', deliveryFeeCents: 350, zone: 'far' },
    ]

    await db.insert(tenantPostalCodes).values(
      caps.map((c) => ({
        tenantId,
        postalCode: c.postalCode,
        city: c.city,
        deliveryFeeCents: c.deliveryFeeCents,
        zone: c.zone,
        isServed: true,
      }))
    )

    console.info(`✓ Inseriti ${caps.length} CAP serviti`)
  } else {
    console.info(`✓ CAP già presenti (${existingCaps.length})`)
  }

  // ----------------------------------------------------------------------
  // Customer di test (solo in dev/staging)
  // ----------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const existingTestCustomer = await db.query.customers.findFirst({
      where: eq(customers.phone, '+393331234567'),
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

  console.info('✅ Seed completato')
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Seed fallito:', err)
  process.exit(1)
})
