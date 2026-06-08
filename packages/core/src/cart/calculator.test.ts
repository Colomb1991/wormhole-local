import { describe, it, expect } from 'vitest'
import {
  calculateSubtotal,
  calculatePrepTime,
  countItems,
  validateCart,
  calculateCashChange,
  type CartItem,
  type CartConfig,
} from './calculator'

const config: CartConfig = {
  prepTimeBufferPerItem: 1,
  minOrderAmountCents: 1000,
}

function item(opts: Partial<CartItem> = {}): CartItem {
  return {
    menuItemId: opts.menuItemId ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: opts.name ?? 'Test',
    unitPriceCents: opts.unitPriceCents ?? 500,
    prepTimeMinutes: opts.prepTimeMinutes ?? 5,
    quantity: opts.quantity ?? 1,
  }
}

describe('calculateSubtotal', () => {
  it('returns 0 for empty cart', () => {
    expect(calculateSubtotal([])).toBe(0)
  })

  it('multiplies price by quantity', () => {
    expect(calculateSubtotal([item({ unitPriceCents: 550, quantity: 2 })])).toBe(1100)
  })

  it('sums multiple items', () => {
    const items = [
      item({ unitPriceCents: 550, quantity: 2 }),
      item({ unitPriceCents: 600, quantity: 1 }),
    ]
    expect(calculateSubtotal(items)).toBe(1700)
  })

  it('handles zero-priced items (e.g. omaggio)', () => {
    const items = [
      item({ unitPriceCents: 0, quantity: 3 }),
      item({ unitPriceCents: 550, quantity: 1 }),
    ]
    expect(calculateSubtotal(items)).toBe(550)
  })
})

describe('countItems', () => {
  it('counts total pieces', () => {
    const items = [item({ quantity: 2 }), item({ quantity: 3 })]
    expect(countItems(items)).toBe(5)
  })
})

describe('calculatePrepTime', () => {
  it('returns 0 for empty cart', () => {
    expect(calculatePrepTime([])).toBe(0)
  })

  it('1 spaghetti 5min → 5 + 1*1 = 6', () => {
    expect(calculatePrepTime([item({ prepTimeMinutes: 5, quantity: 1 })], config)).toBe(6)
  })

  it('1 spaghetti(5) + 1 ravioli(15) → 15 + 2*1 = 17', () => {
    const items = [
      item({ prepTimeMinutes: 5, quantity: 1 }),
      item({ prepTimeMinutes: 15, quantity: 1 }),
    ]
    expect(calculatePrepTime(items, config)).toBe(17)
  })

  it('4 pieces with max prep 15 → 15 + 4*1 = 19', () => {
    const items = [
      item({ prepTimeMinutes: 15, quantity: 2 }),
      item({ prepTimeMinutes: 8, quantity: 2 }),
    ]
    expect(calculatePrepTime(items, config)).toBe(19)
  })

  it('uses default buffer when config not provided', () => {
    expect(calculatePrepTime([item({ prepTimeMinutes: 5, quantity: 1 })])).toBe(6)
  })
})

describe('validateCart', () => {
  it('rejects empty cart', () => {
    const result = validateCart([], config)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe('EMPTY_CART')
  })

  it('rejects below minimum', () => {
    const result = validateCart([item({ unitPriceCents: 500, quantity: 1 })], config)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toBe('BELOW_MIN_ORDER')
      expect(result.missingCents).toBe(500)
    }
  })

  it('accepts exactly at minimum', () => {
    const result = validateCart([item({ unitPriceCents: 1000, quantity: 1 })], config)
    expect(result.valid).toBe(true)
  })

  it('rejects invalid quantity (0 or negative)', () => {
    const result = validateCart([item({ quantity: 0 })], config)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe('INVALID_QUANTITY')
  })

  it('rejects fractional quantity', () => {
    const result = validateCart([item({ quantity: 1.5, unitPriceCents: 2000 })], config)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe('INVALID_QUANTITY')
  })
})

describe('calculateCashChange', () => {
  it('exact payment → 0 change', () => {
    expect(calculateCashChange(1950, 1950, 5000)).toEqual({ valid: true, changeCents: 0 })
  })

  it('correct change calculation', () => {
    expect(calculateCashChange(1950, 2000, 5000)).toEqual({ valid: true, changeCents: 50 })
  })

  it('rejects insufficient payment', () => {
    const result = calculateCashChange(1950, 1900, 5000)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe('INSUFFICIENT')
  })

  it('rejects change exceeding max (rider limit)', () => {
    const result = calculateCashChange(1000, 7000, 5000)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe('EXCEEDS_MAX')
  })

  it('accepts change exactly at max', () => {
    expect(calculateCashChange(1000, 6000, 5000)).toEqual({ valid: true, changeCents: 5000 })
  })
})
