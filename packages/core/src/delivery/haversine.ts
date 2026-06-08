import type { Coordinates } from '@wormhole/shared'

const EARTH_RADIUS_KM = 6371

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Calcola la distanza in linea d'aria (km) tra due coordinate usando la
 * formula di Haversine. Funzione pura, side-effect-free.
 *
 * @example
 *   haversineDistance({ lat: 43.5453, lon: 10.3163 }, { lat: 43.5300, lon: 10.3100 })
 *   // → ~1.8 km
 */
export function haversineDistance(a: Coordinates, b: Coordinates): number {
  if (a.lat === b.lat && a.lon === b.lon) return 0

  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const deltaLat = toRadians(b.lat - a.lat)
  const deltaLon = toRadians(b.lon - a.lon)

  const h =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))

  return EARTH_RADIUS_KM * c
}
