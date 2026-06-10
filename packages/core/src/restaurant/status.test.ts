import { describe, it, expect } from 'vitest'
import { getRestaurantStatus, type RestaurantStatusConfig } from './status'

const baseConfig: RestaurantStatusConfig = {
  weeklySchedule: {
    monday: { isOpen: true },
    tuesday: { isOpen: false },
    wednesday: { isOpen: true },
    thursday: { isOpen: true },
    friday: { isOpen: true },
    saturday: { isOpen: true },
    sunday: { isOpen: true },
  },
  deliveryWindowStart: '19:00',
  deliveryWindowEnd: '22:00',
  minOrderAmountCents: 1000,
}

// Lun 2026-06-08, Mar 2026-06-09, Mer 2026-06-10
function at(iso: string): Date {
  return new Date(iso)
}

describe('getRestaurantStatus', () => {
  it('paused ha priorità su tutto', () => {
    const s = getRestaurantStatus(baseConfig, at('2026-06-08T20:00:00'), true)
    expect(s.state).toBe('paused')
    expect(s.acceptingOrders).toBe(false)
    expect(s.indicator).toBe('red')
  })

  it('chiuso nel giorno non aperto, indica il prossimo giorno aperto', () => {
    // Martedì = chiuso; prossimo aperto = mercoledì
    const s = getRestaurantStatus(baseConfig, at('2026-06-09T20:00:00'), false)
    expect(s.state).toBe('closed_today')
    expect(s.acceptingOrders).toBe(false)
    expect(s.message).toContain('martedì')
    expect(s.message).toContain('mercoledì')
    expect(s.message).toContain('19:00')
  })

  it('aperto ma prima della finestra → before_window, accetta prenotazioni', () => {
    const s = getRestaurantStatus(baseConfig, at('2026-06-08T18:00:00'), false)
    expect(s.state).toBe('before_window')
    expect(s.acceptingOrders).toBe(true)
    expect(s.indicator).toBe('yellow')
    expect(s.message).toContain('19:00')
  })

  it('dentro la finestra → open con min order', () => {
    const s = getRestaurantStatus(baseConfig, at('2026-06-08T20:00:00'), false)
    expect(s.state).toBe('open')
    expect(s.acceptingOrders).toBe(true)
    expect(s.indicator).toBe('green')
    expect(s.message).toContain('10,00€')
  })

  it('al limite di apertura (19:00) è già open', () => {
    const s = getRestaurantStatus(baseConfig, at('2026-06-08T19:00:00'), false)
    expect(s.state).toBe('open')
  })

  it('dopo la finestra → after_window, non accetta', () => {
    const s = getRestaurantStatus(baseConfig, at('2026-06-08T22:30:00'), false)
    expect(s.state).toBe('after_window')
    expect(s.acceptingOrders).toBe(false)
  })

  it('al limite di chiusura (22:00) è già after_window', () => {
    const s = getRestaurantStatus(baseConfig, at('2026-06-08T22:00:00'), false)
    expect(s.state).toBe('after_window')
  })
})
