import { describe, it, expect } from 'vitest'
import { calculateAvailableSlots, generateTheoreticalSlots, getDayOfWeek } from './calculator'
import type { TenantSlotConfig, SlotCalculatorInput } from './types'

const config: TenantSlotConfig = {
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
}

// 2026-05-15 = venerdì (capacity 5)
function fri(time: string): Date {
  const d = new Date('2026-05-15T00:00:00')
  const [h, m] = time.split(':').map(Number)
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return d
}
// 2026-05-11 = lunedì (capacity 3)
function mon(time: string): Date {
  const d = new Date('2026-05-11T00:00:00')
  const [h, m] = time.split(':').map(Number)
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return d
}
// 2026-05-12 = martedì (chiuso)
function tue(time: string): Date {
  const d = new Date('2026-05-12T00:00:00')
  const [h, m] = time.split(':').map(Number)
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return d
}

// FIX: tutti i campi rispettano gli override delle opts.
function makeInput(opts: Partial<SlotCalculatorInput> = {}): SlotCalculatorInput {
  return {
    customerPostalCode: opts.customerPostalCode ?? '57125',
    cartPrepTimeMinutes: opts.cartPrepTimeMinutes ?? 10,
    currentTime: opts.currentTime ?? fri('18:50'),
    config: opts.config ?? config,
    ordersByStartTime: opts.ordersByStartTime ?? new Map(),
    isCapCompatible: opts.isCapCompatible ?? (() => true),
  }
}

describe('getDayOfWeek', () => {
  it('returns "friday" for 2026-05-15', () => {
    expect(getDayOfWeek(fri('12:00'))).toBe('friday')
  })
  it('returns "tuesday" for 2026-05-12', () => {
    expect(getDayOfWeek(tue('12:00'))).toBe('tuesday')
  })
  it('returns "monday" for 2026-05-11', () => {
    expect(getDayOfWeek(mon('12:00'))).toBe('monday')
  })
})

describe('generateTheoreticalSlots', () => {
  it('generates 6 slots for 19:00-22:00 window @ 30min', () => {
    const slots = generateTheoreticalSlots(fri('12:00'), config)
    expect(slots).toHaveLength(6)
    expect(slots[0]!.startTime.getHours()).toBe(19)
    expect(slots[0]!.startTime.getMinutes()).toBe(0)
    expect(slots[5]!.startTime.getHours()).toBe(21)
    expect(slots[5]!.startTime.getMinutes()).toBe(30)
    expect(slots[5]!.endTime.getHours()).toBe(22)
  })

  it('generates 12 slots @ 15min', () => {
    const slots = generateTheoreticalSlots(fri('12:00'), {
      ...config,
      slotDurationMinutes: 15,
    })
    expect(slots).toHaveLength(12)
  })
})

describe('calculateAvailableSlots', () => {
  it('marks all slots as restaurant_closed on closed day', () => {
    const result = calculateAvailableSlots(makeInput({ currentTime: tue('18:00') }))
    expect(result).toHaveLength(6)
    expect(result.every((s) => !s.isAvailable)).toBe(true)
    expect(result.every((s) => s.unavailabilityReason === 'restaurant_closed')).toBe(true)
  })

  it('marks past slots as past_time', () => {
    const result = calculateAvailableSlots(makeInput({ currentTime: fri('20:15') }))
    // Past: 19:00, 19:30, 20:00
    expect(result[0]!.unavailabilityReason).toBe('past_time')
    expect(result[1]!.unavailabilityReason).toBe('past_time')
    expect(result[2]!.unavailabilityReason).toBe('past_time')
    // Future: 20:30
    expect(result[3]!.isAvailable).toBe(true)
  })

  it('rejects slots that cannot be prepared in time', () => {
    // Current 19:50, prep 30 min → minPrepEnd 20:20
    // Slot 20:00: 20:20 > 20:00 → prep_time_exceeds
    // Slot 20:30: 20:20 < 20:30 → available
    const result = calculateAvailableSlots(
      makeInput({ currentTime: fri('19:50'), cartPrepTimeMinutes: 30 })
    )
    const at2000 = result.find(
      (s) => s.startTime.getHours() === 20 && s.startTime.getMinutes() === 0
    )
    const at2030 = result.find(
      (s) => s.startTime.getHours() === 20 && s.startTime.getMinutes() === 30
    )
    expect(at2000!.unavailabilityReason).toBe('prep_time_exceeds')
    expect(at2030!.isAvailable).toBe(true)
  })

  it('marks first available as recommended', () => {
    const result = calculateAvailableSlots(makeInput({ currentTime: fri('18:50') }))
    const available = result.filter((s) => s.isAvailable)
    expect(available.length).toBeGreaterThan(0)
    expect(available[0]!.isRecommended).toBe(true)
    expect(available.slice(1).every((s) => !s.isRecommended)).toBe(true)
  })

  it('marks slot full when capacity reached (monday, cap 3)', () => {
    // Lunedì ha capacity 3. Inserisco 3 ordini → full.
    const slot1900 = mon('19:00').toISOString()
    const orders = new Map([
      [
        slot1900,
        [
          { deliveryPostalCode: '57125' },
          { deliveryPostalCode: '57125' },
          { deliveryPostalCode: '57125' },
        ],
      ],
    ])
    const result = calculateAvailableSlots(
      makeInput({ currentTime: mon('18:00'), ordersByStartTime: orders })
    )
    const at1900 = result.find(
      (s) => s.startTime.getHours() === 19 && s.startTime.getMinutes() === 0
    )
    expect(at1900!.unavailabilityReason).toBe('capacity_full')
    expect(at1900!.remainingCapacity).toBe(0)
  })

  it('respects cap incompatibility', () => {
    const slot1900 = fri('19:00').toISOString()
    const orders = new Map([[slot1900, [{ deliveryPostalCode: '57128' }]]])
    const result = calculateAvailableSlots(
      makeInput({
        currentTime: fri('18:00'),
        ordersByStartTime: orders,
        isCapCompatible: (_n, existing) => existing.length === 0,
      })
    )
    const at1900 = result.find(
      (s) => s.startTime.getHours() === 19 && s.startTime.getMinutes() === 0
    )
    expect(at1900!.unavailabilityReason).toBe('cap_incompatible')
  })

  it('reports correct remainingCapacity (monday, cap 3, 1 order → 2 left)', () => {
    const slot1900 = mon('19:00').toISOString()
    const orders = new Map([[slot1900, [{ deliveryPostalCode: '57125' }]]])
    const result = calculateAvailableSlots(
      makeInput({ currentTime: mon('18:00'), ordersByStartTime: orders })
    )
    const at1900 = result.find(
      (s) => s.startTime.getHours() === 19 && s.startTime.getMinutes() === 0
    )
    expect(at1900!.remainingCapacity).toBe(2) // 3 - 1
    expect(at1900!.isAvailable).toBe(true)
  })

  it('reports correct remainingCapacity (friday, cap 5, 1 order → 4 left)', () => {
    const slot1900 = fri('19:00').toISOString()
    const orders = new Map([[slot1900, [{ deliveryPostalCode: '57125' }]]])
    const result = calculateAvailableSlots(
      makeInput({ currentTime: fri('18:00'), ordersByStartTime: orders })
    )
    const at1900 = result.find(
      (s) => s.startTime.getHours() === 19 && s.startTime.getMinutes() === 0
    )
    expect(at1900!.remainingCapacity).toBe(4) // 5 - 1
    expect(at1900!.isAvailable).toBe(true)
  })
})
