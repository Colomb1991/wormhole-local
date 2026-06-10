import type { Order } from '@wormhole/database'

/**
 * Ordine serializzato per il confine Server Action → client component
 * (date come stringhe ISO, solo i campi che la UI usa).
 */
export interface SerializedOrder {
  id: string
  orderNumber: number
  status: Order['status']
  items: Order['items']
  subtotalCents: number
  deliveryFeeCents: number
  totalCents: number
  deliveryAddress: Order['deliveryAddress']
  deliveryPostalCode: string
  scheduledSlotIso: string
  deliveryCode: string
  paymentMethod: string
  customerPayingWithCents: number | null
  changeToGiveCents: number | null
  customerNotes: string | null
  rejectionReason: string | null
  statusHistory: Order['statusHistory']
  createdAtIso: string
  acceptedAtIso: string | null
  readyAtIso: string | null
  deliveredAtIso: string | null
  cancelledAtIso: string | null
}

export function serializeOrder(o: Order): SerializedOrder {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    items: o.items,
    subtotalCents: o.subtotalCents,
    deliveryFeeCents: o.deliveryFeeCents,
    totalCents: o.totalCents,
    deliveryAddress: o.deliveryAddress,
    deliveryPostalCode: o.deliveryPostalCode,
    scheduledSlotIso: o.scheduledSlot.toISOString(),
    deliveryCode: o.deliveryCode,
    paymentMethod: o.paymentMethod,
    customerPayingWithCents: o.customerPayingWithCents,
    changeToGiveCents: o.changeToGiveCents,
    customerNotes: o.customerNotes,
    rejectionReason: o.rejectionReason,
    statusHistory: o.statusHistory,
    createdAtIso: o.createdAt.toISOString(),
    acceptedAtIso: o.acceptedAt?.toISOString() ?? null,
    readyAtIso: o.readyAt?.toISOString() ?? null,
    deliveredAtIso: o.deliveredAt?.toISOString() ?? null,
    cancelledAtIso: o.cancelledAt?.toISOString() ?? null,
  }
}
