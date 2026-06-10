/**
 * Costruzione snapshot e totali di un ordine (FEATURE_SPECS sez. 7.2).
 * Logica pura: niente I/O. I prezzi sono sempre in centesimi (ADR-003).
 */
import type { CartItem } from '../cart/calculator'
import { calculateSubtotal } from '../cart/calculator'

export interface OrderItemSnapshot {
  menuItemId: string
  name: string
  unitPriceCents: number
  prepTimeMinutes: number
  quantity: number
  totalCents: number
}

/**
 * Trasforma le righe di carrello in snapshot d'ordine (con totale per riga),
 * da salvare come JSON immutabile nell'ordine.
 */
export function buildOrderItems(items: CartItem[]): OrderItemSnapshot[] {
  return items.map((i) => ({
    menuItemId: i.menuItemId,
    name: i.name,
    unitPriceCents: i.unitPriceCents,
    prepTimeMinutes: i.prepTimeMinutes,
    quantity: i.quantity,
    totalCents: i.unitPriceCents * i.quantity,
  }))
}

export interface OrderTotals {
  subtotalCents: number
  deliveryFeeCents: number
  totalCents: number
}

/**
 * Calcola subtotale + tariffa consegna = totale.
 */
export function calculateOrderTotals(items: CartItem[], deliveryFeeCents: number): OrderTotals {
  const subtotalCents = calculateSubtotal(items)
  return {
    subtotalCents,
    deliveryFeeCents,
    totalCents: subtotalCents + deliveryFeeCents,
  }
}
