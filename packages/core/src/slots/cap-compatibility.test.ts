import { describe, it, expect } from 'vitest'
import { makeCapCompatibilityChecker } from './cap-compatibility'

describe('makeCapCompatibilityChecker', () => {
  const distances = {
    '57125': 1, // 1 km dal ristorante
    '57121': 2,
    '57128': 5,
    '57999': null, // non servito
  } as Record<string, number | null>

  const checker = makeCapCompatibilityChecker(
    { slotDurationMinutes: 30 },
    { fromRestaurant: (cap) => distances[cap] ?? null }
  )

  it('accepts when slot is empty', () => {
    expect(checker('57125', [])).toBe(true)
  })

  it('accepts close caps within budget', () => {
    // 1 existing @ 1km: 2*1*3 + 2 = 8 min
    // new @ 1km: 8 min
    // total: 16 min, budget 30+10=40 → ok
    expect(checker('57125', ['57125'])).toBe(true)
  })

  it('rejects when total time exceeds budget', () => {
    // 3 existing @ 5km: 3 * (2*5*3 + 2) = 3*32 = 96 min
    // new @ 5km: 32 min, total 128 → exceeds 40
    expect(checker('57128', ['57128', '57128', '57128'])).toBe(false)
  })

  it('rejects unknown cap (not in matrix)', () => {
    expect(checker('57999', ['57125'])).toBe(false)
  })

  it('rejects when an existing cap is unknown', () => {
    expect(checker('57125', ['57999'])).toBe(false)
  })
})
