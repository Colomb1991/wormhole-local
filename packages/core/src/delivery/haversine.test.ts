import { describe, it, expect } from 'vitest'
import { haversineDistance } from './haversine'

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    const point = { lat: 43.5453, lon: 10.3163 }
    expect(haversineDistance(point, point)).toBe(0)
  })

  it('computes distance between two known Livorno points (~1-2 km)', () => {
    // Centro Livorno vs Stazione (approx)
    const center = { lat: 43.5453, lon: 10.3163 }
    const station = { lat: 43.5536, lon: 10.3173 }
    const km = haversineDistance(center, station)
    expect(km).toBeGreaterThan(0.5)
    expect(km).toBeLessThan(2)
  })

  it('is symmetric', () => {
    const a = { lat: 43.5, lon: 10.3 }
    const b = { lat: 43.6, lon: 10.4 }
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 6)
  })

  it('computes ~111 km for 1 degree of latitude difference at equator', () => {
    const a = { lat: 0, lon: 0 }
    const b = { lat: 1, lon: 0 }
    const km = haversineDistance(a, b)
    expect(km).toBeGreaterThan(110)
    expect(km).toBeLessThan(112)
  })

  it('Livorno → Pisa is roughly 20 km', () => {
    const livorno = { lat: 43.5485, lon: 10.3106 }
    const pisa = { lat: 43.7228, lon: 10.4017 }
    const km = haversineDistance(livorno, pisa)
    expect(km).toBeGreaterThan(15)
    expect(km).toBeLessThan(25)
  })
})
