'use server'

import { ok, err, type Result, nowInRomeTz } from '@wormhole/shared'
import {
  calculatePrepTime,
  validateCart,
  calculateCashChange,
  calculateOrderTotals,
  buildOrderItems,
  type CartItem,
} from '@wormhole/core'
import type { TenantSlotConfig } from '@wormhole/core'
import { getTenantBySlug } from '@/lib/tenant'
import { getCurrentCustomer } from '@/lib/session'
import { getDeliveryFeeCents, getAvailableSlots } from '@/lib/slots'
import { getMenuItemsByIds, createOrder } from '@/lib/orders'

export interface SerializedSlot {
  startTimeIso: string
  endTimeIso: string
  isRecommended: boolean
  remainingCapacity: number
}

/**
 * Restituisce gli slot DISPONIBILI per il CAP e il tempo di preparazione del
 * carrello. Gli slot non disponibili non vengono inviati (FEATURE_SPECS 4.6).
 */
export async function getSlotsAction(input: {
  tenantSlug: string
  postalCode: string
  cartPrepTimeMinutes: number
}): Promise<Result<{ slots: SerializedSlot[]; deliveryFeeCents: number }>> {
  const tenant = await getTenantBySlug(input.tenantSlug)
  if (!tenant) return err('Ristorante non trovato', 'TENANT_NOT_FOUND')

  const deliveryFeeCents = await getDeliveryFeeCents(tenant.id, input.postalCode)
  if (deliveryFeeCents == null) {
    return err('Non consegniamo a questo CAP', 'CAP_NOT_SERVED')
  }

  const config: TenantSlotConfig = tenant.config
  const slots = await getAvailableSlots(
    tenant.id,
    config,
    input.postalCode,
    input.cartPrepTimeMinutes,
    nowInRomeTz()
  )

  const available = slots
    .filter((s) => s.isAvailable)
    .map((s) => ({
      startTimeIso: s.startTime.toISOString(),
      endTimeIso: s.endTime.toISOString(),
      isRecommended: s.isRecommended,
      remainingCapacity: s.remainingCapacity,
    }))

  return ok({ slots: available, deliveryFeeCents })
}

export interface CreateOrderPayload {
  tenantSlug: string
  items: CartItem[]
  address: {
    street: string
    postalCode: string
    city: string
    buildingNumber?: string | null
    notes?: string | null
  }
  scheduledSlotIso: string
  customerPayingWithCents?: number | null
  customerNotes?: string | null
}

/**
 * Crea l'ordine (cash on delivery). Ri-valida tutto lato server: identità,
 * prezzi (anti-tampering), carrello, slot ancora disponibile, resto contanti.
 */
export async function createOrderAction(
  payload: CreateOrderPayload
): Promise<Result<{ orderId: string; orderNumber: number; deliveryCode: string }>> {
  const tenant = await getTenantBySlug(payload.tenantSlug)
  if (!tenant) return err('Ristorante non trovato', 'TENANT_NOT_FOUND')

  const customer = await getCurrentCustomer(tenant.id)
  if (!customer) return err('Sessione scaduta, registrati di nuovo', 'UNAUTHORIZED')

  if (payload.items.length === 0) return err('Carrello vuoto', 'EMPTY_CART')

  const deliveryFeeCents = await getDeliveryFeeCents(tenant.id, payload.address.postalCode)
  if (deliveryFeeCents == null) return err('Non consegniamo a questo CAP', 'CAP_NOT_SERVED')

  // Anti-tampering: ricarica i piatti e verifica prezzo/disponibilità lato DB.
  const dbItems = await getMenuItemsByIds(
    tenant.id,
    payload.items.map((i) => i.menuItemId)
  )
  const dbById = new Map(dbItems.map((i) => [i.id, i]))
  const verifiedItems: CartItem[] = []
  for (const item of payload.items) {
    const dbItem = dbById.get(item.menuItemId)
    if (!dbItem || dbItem.deletedAt) return err(`Piatto non più disponibile: ${item.name}`, 'ITEM_GONE')
    if (!dbItem.isAvailable) return err(`Esaurito: ${dbItem.name}`, 'ITEM_UNAVAILABLE')
    if (dbItem.priceCents !== item.unitPriceCents) {
      return err(`Il prezzo di ${dbItem.name} è cambiato, ricarica il carrello`, 'PRICE_CHANGED')
    }
    verifiedItems.push({
      menuItemId: dbItem.id,
      name: dbItem.name,
      unitPriceCents: dbItem.priceCents,
      prepTimeMinutes: dbItem.prepTimeMinutes,
      quantity: item.quantity,
    })
  }

  const cartConfig = {
    minOrderAmountCents: tenant.config.minOrderAmountCents,
    prepTimeBufferPerItem: tenant.config.prepTimeBufferPerItem,
  }
  const cartCheck = validateCart(verifiedItems, cartConfig)
  if (!cartCheck.valid) return err(cartCheck.message, cartCheck.error)

  // Slot ancora disponibile?
  const cartPrepTime = calculatePrepTime(verifiedItems, cartConfig)
  const slots = await getAvailableSlots(
    tenant.id,
    tenant.config,
    payload.address.postalCode,
    cartPrepTime,
    nowInRomeTz()
  )
  const chosen = slots.find((s) => s.isAvailable && s.startTime.toISOString() === payload.scheduledSlotIso)
  if (!chosen) {
    return err('Lo slot scelto non è più disponibile. Scegli un altro orario.', 'SLOT_UNAVAILABLE')
  }

  // Totali + resto contanti.
  const totals = calculateOrderTotals(verifiedItems, deliveryFeeCents)
  let changeToGiveCents: number | null = null
  const payingWith = payload.customerPayingWithCents ?? null
  if (payingWith != null) {
    const change = calculateCashChange(totals.totalCents, payingWith, tenant.config.maxCashChangeCents)
    if (!change.valid) return err(change.message, change.error)
    changeToGiveCents = change.changeCents
  }

  const created = await createOrder({
    tenantId: tenant.id,
    customerId: customer.id,
    items: buildOrderItems(verifiedItems),
    subtotalCents: totals.subtotalCents,
    deliveryFeeCents: totals.deliveryFeeCents,
    totalCents: totals.totalCents,
    deliveryAddress: {
      street: payload.address.street.trim(),
      postalCode: payload.address.postalCode,
      city: payload.address.city,
      buildingNumber: payload.address.buildingNumber?.trim() || null,
      floor: null,
      notes: payload.address.notes?.trim() || null,
    },
    deliveryPostalCode: payload.address.postalCode,
    scheduledSlot: new Date(payload.scheduledSlotIso),
    deliveryCode: customer.deliveryCode,
    customerPayingWithCents: payingWith,
    changeToGiveCents,
    customerNotes: payload.customerNotes?.trim() || null,
  })

  return ok({ orderId: created.id, orderNumber: created.orderNumber, deliveryCode: created.deliveryCode })
}
