import { RIDER_TRAVEL } from '@wormhole/shared'

export interface CapCompatibilityConfig {
  slotDurationMinutes: number
}

export interface DistanceLookup {
  /**
   * Distanza in km dal ristorante a `cap`.
   * Restituisce `null` se non in matrice (CAP non servito).
   */
  fromRestaurant: (cap: string) => number | null
}

/**
 * Verifica se aggiungere un nuovo CAP a uno slot già pieno di consegne è
 * fattibile entro il tempo dello slot (più buffer).
 *
 * Modello semplificato (FEATURE_SPECS sez. 4.5):
 *   - Ogni consegna esistente costa: 2 * (distanza_km * 3 min/km) + 2 min sosta
 *   - Aggiunta nuova consegna: stesso costo
 *   - Confronto con: slotDuration + 10 min di buffer
 *
 * In assenza di distanze (CAP non in matrice), considera incompatibile per
 * sicurezza.
 */
export function makeCapCompatibilityChecker(
  config: CapCompatibilityConfig,
  distances: DistanceLookup
) {
  return function isCapCompatible(newCap: string, existingCaps: string[]): boolean {
    if (existingCaps.length === 0) return true

    let totalMinutes = 0
    for (const cap of existingCaps) {
      const km = distances.fromRestaurant(cap)
      if (km === null) return false
      totalMinutes += km * RIDER_TRAVEL.MINUTES_PER_KM * 2 + RIDER_TRAVEL.STOP_TIME_MINUTES
    }

    const newKm = distances.fromRestaurant(newCap)
    if (newKm === null) return false
    totalMinutes += newKm * RIDER_TRAVEL.MINUTES_PER_KM * 2 + RIDER_TRAVEL.STOP_TIME_MINUTES

    const maxAllowed = config.slotDurationMinutes + RIDER_TRAVEL.SLOT_TIME_BUFFER_MIN
    return totalMinutes <= maxAllowed
  }
}
