import { and, eq, inArray } from 'drizzle-orm'
import { db, orders, tenantPostalCodes, type OrderStatus } from '@wormhole/database'
import {
  calculateAvailableSlots,
  generateTheoreticalSlots,
  type AvailableSlot,
  type TenantSlotConfig,
} from '@wormhole/core'

/** Stati ordine che occupano la capacità di uno slot. */
const CAPACITY_STATUSES: OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'in_delivery',
]

/**
 * Tariffa di consegna per un CAP servito, o null se non servito.
 */
export async function getDeliveryFeeCents(
  tenantId: string,
  postalCode: string
): Promise<number | null> {
  const cap = await db.query.tenantPostalCodes.findFirst({
    where: and(
      eq(tenantPostalCodes.tenantId, tenantId),
      eq(tenantPostalCodes.postalCode, postalCode),
      eq(tenantPostalCodes.isServed, true)
    ),
    columns: { deliveryFeeCents: true },
  })
  return cap?.deliveryFeeCents ?? null
}

/**
 * Calcola gli slot di consegna disponibili (FEATURE_SPECS sez. 4) caricando gli
 * ordini attivi che occupano gli slot della finestra odierna.
 *
 * Nota: la compatibilità CAP usa una matrice distanze ancora non popolata
 * (DT-002). Finché la matrice non c'è, `isCapCompatible` ritorna sempre true:
 * si controlla solo la capacità numerica dello slot.
 */
export async function getAvailableSlots(
  tenantId: string,
  config: TenantSlotConfig,
  customerPostalCode: string,
  cartPrepTimeMinutes: number,
  now: Date
): Promise<AvailableSlot[]> {
  const theoretical = generateTheoreticalSlots(now, config)
  const ordersByStartTime = new Map<string, { deliveryPostalCode: string }[]>()

  const startTimes = theoretical.map((s) => s.startTime)
  if (startTimes.length > 0) {
    const rows = await db.query.orders.findMany({
      where: and(
        eq(orders.tenantId, tenantId),
        inArray(orders.status, CAPACITY_STATUSES),
        inArray(orders.scheduledSlot, startTimes)
      ),
      columns: { scheduledSlot: true, deliveryPostalCode: true },
    })
    for (const row of rows) {
      const key = row.scheduledSlot.toISOString()
      const list = ordersByStartTime.get(key) ?? []
      list.push({ deliveryPostalCode: row.deliveryPostalCode })
      ordersByStartTime.set(key, list)
    }
  }

  return calculateAvailableSlots({
    customerPostalCode,
    cartPrepTimeMinutes,
    currentTime: now,
    config,
    ordersByStartTime,
    isCapCompatible: () => true,
  })
}
