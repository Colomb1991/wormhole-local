import { describe, it, expect } from 'vitest'
import { buildOrderItems, calculateOrderTotals } from './totals'
import type { CartItem } from '../cart/calculator'

const items: CartItem[] = [
  { menuItemId: 'a', name: 'Ravioli', unitPriceCents: 400, prepTimeMinutes: 10, quantity: 2 },
  { menuItemId: 'b', name: 'Riso', unitPriceCents: 380, prepTimeMinutes: 12, quantity: 1 },
]

describe('buildOrderItems', () => {
  it('aggiunge il totale per riga', () => {
    const snap = buildOrderItems(items)
    expect(snap[0]).toMatchObject({ menuItemId: 'a', quantity: 2, totalCents: 800 })
    expect(snap[1]).toMatchObject({ menuItemId: 'b', quantity: 1, totalCents: 380 })
  })
})

describe('calculateOrderTotals', () => {
  it('somma subtotale e consegna', () => {
    const t = calculateOrderTotals(items, 250)
    expect(t.subtotalCents).toBe(1180)
    expect(t.deliveryFeeCents).toBe(250)
    expect(t.totalCents).toBe(1430)
  })

  it('gestisce consegna gratuita', () => {
    const t = calculateOrderTotals(items, 0)
    expect(t.totalCents).toBe(1180)
  })
})
