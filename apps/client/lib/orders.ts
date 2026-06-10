import { and, eq, inArray, sql } from 'drizzle-orm'
import {
  db,
  orders,
  orderSequences,
  menuItems,
  type Address,
  type MenuItem,
  type Order,
  type OrderItem,
} from '@wormhole/database'

/**
 * Ricarica i piatti per id (per validazione anti-tampering prezzi al checkout).
 */
export async function getMenuItemsByIds(tenantId: string, ids: string[]): Promise<MenuItem[]> {
  if (ids.length === 0) return []
  return db.query.menuItems.findMany({
    where: and(eq(menuItems.tenantId, tenantId), inArray(menuItems.id, ids)),
  })
}

export interface CreateOrderParams {
  tenantId: string
  customerId: string
  items: OrderItem[]
  subtotalCents: number
  deliveryFeeCents: number
  totalCents: number
  deliveryAddress: Address
  deliveryPostalCode: string
  scheduledSlot: Date
  deliveryCode: string
  customerPayingWithCents: number | null
  changeToGiveCents: number | null
  customerNotes: string | null
}

/**
 * Crea l'ordine in transazione: incrementa la sequenza order number del tenant
 * e inserisce la riga con lo snapshot dei piatti e lo storico di stato iniziale.
 */
export async function createOrder(params: CreateOrderParams): Promise<Order> {
  return db.transaction(async (tx) => {
    const [seq] = await tx
      .update(orderSequences)
      .set({
        lastOrderNumber: sql`${orderSequences.lastOrderNumber} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(orderSequences.tenantId, params.tenantId))
      .returning()
    if (!seq) throw new Error('order sequence missing for tenant')

    const now = new Date()
    const [created] = await tx
      .insert(orders)
      .values({
        tenantId: params.tenantId,
        customerId: params.customerId,
        orderNumber: seq.lastOrderNumber,
        items: params.items,
        subtotalCents: params.subtotalCents,
        deliveryFeeCents: params.deliveryFeeCents,
        totalCents: params.totalCents,
        deliveryAddress: params.deliveryAddress,
        deliveryPostalCode: params.deliveryPostalCode,
        scheduledSlot: params.scheduledSlot,
        deliveryCode: params.deliveryCode,
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        customerPayingWithCents: params.customerPayingWithCents,
        changeToGiveCents: params.changeToGiveCents,
        status: 'pending',
        statusHistory: [{ status: 'pending', at: now.toISOString(), byUserId: null, reason: null }],
        customerNotes: params.customerNotes,
      })
      .returning()
    if (!created) throw new Error('order insert failed')
    return created
  })
}

/**
 * Recupera un ordine verificando che appartenga al customer indicato (per la
 * pagina di conferma/stato).
 */
export async function getOrderForCustomer(
  orderId: string,
  customerId: string
): Promise<Order | undefined> {
  return db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.customerId, customerId)),
  })
}
