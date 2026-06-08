import { addMinutes } from 'date-fns'
import type {
  AvailableSlot,
  DayOfWeek,
  SlotCalculatorInput,
  TenantSlotConfig,
  TheoreticalSlot,
} from './types'

const DAY_NAMES: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

/**
 * Restituisce il nome del giorno della settimana per un Date locale.
 * Usa `getDay()` standard JS che restituisce 0=domenica … 6=sabato.
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  return DAY_NAMES[date.getDay()]!
}

/**
 * Costruisce un Date settando ore/minuti dalla stringa "HH:MM" sul giorno
 * del Date di riferimento.
 */
function setTimeOfDay(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const out = new Date(date)
  out.setHours(h ?? 0, m ?? 0, 0, 0)
  return out
}

/**
 * Genera la lista degli slot teorici della finestra di consegna del giorno
 * indicato da `referenceTime`, basata sulla config tenant.
 *
 * Esempio: window 19:00-22:00, slotDuration 30min →
 *   [19:00-19:30, 19:30-20:00, 20:00-20:30, 20:30-21:00, 21:00-21:30, 21:30-22:00]
 */
export function generateTheoreticalSlots(
  referenceTime: Date,
  config: TenantSlotConfig
): TheoreticalSlot[] {
  const start = setTimeOfDay(referenceTime, config.deliveryWindowStart)
  const end = setTimeOfDay(referenceTime, config.deliveryWindowEnd)
  const slots: TheoreticalSlot[] = []

  let cursor = start
  while (cursor < end) {
    const slotEnd = addMinutes(cursor, config.slotDurationMinutes)
    if (slotEnd > end) break
    slots.push({ startTime: new Date(cursor), endTime: slotEnd })
    cursor = slotEnd
  }
  return slots
}

/**
 * Calcola la lista di slot disponibili per un cliente. Funzione pura: tutte
 * le dipendenze esterne (ordini esistenti, compatibilità CAP) sono iniettate
 * via `input`. La I/O sta sopra il chiamante.
 *
 * Algoritmo (FEATURE_SPECS sez. 4):
 *   1. Determina day-of-week e relativa config giornaliera
 *   2. Se chiuso: ritorna slot teorici tutti marcati `restaurant_closed`
 *   3. Genera slot teorici della finestra di consegna
 *   4. Per ogni slot: check tempo passato, tempo prep, capacità, CAP compat
 *   5. Marca il primo `isAvailable` come `isRecommended`
 */
export function calculateAvailableSlots(input: SlotCalculatorInput): AvailableSlot[] {
  const { currentTime, config, customerPostalCode, cartPrepTimeMinutes } = input
  const dayName = getDayOfWeek(currentTime)
  const dayConfig = config.weeklySchedule[dayName]

  const theoretical = generateTheoreticalSlots(currentTime, config)

  if (!dayConfig.isOpen) {
    return theoretical.map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
      remainingCapacity: 0,
      isAvailable: false,
      isRecommended: false,
      unavailabilityReason: 'restaurant_closed',
    }))
  }

  const minPrepEnd = addMinutes(currentTime, cartPrepTimeMinutes)

  const slots: AvailableSlot[] = theoretical.map((s) => {
    const ordersInSlot = input.ordersByStartTime.get(s.startTime.toISOString()) ?? []
    const existingCaps = ordersInSlot.map((o) => o.deliveryPostalCode)

    // Check 1: slot già passato
    if (s.startTime <= currentTime) {
      return {
        startTime: s.startTime,
        endTime: s.endTime,
        remainingCapacity: 0,
        isAvailable: false,
        isRecommended: false,
        unavailabilityReason: 'past_time',
      }
    }

    // Check 2: tempo di preparazione eccede
    if (minPrepEnd > s.startTime) {
      return {
        startTime: s.startTime,
        endTime: s.endTime,
        remainingCapacity: 0,
        isAvailable: false,
        isRecommended: false,
        unavailabilityReason: 'prep_time_exceeds',
      }
    }

    // Check 3: capacità slot
    if (ordersInSlot.length >= dayConfig.ordersPerSlot) {
      return {
        startTime: s.startTime,
        endTime: s.endTime,
        remainingCapacity: 0,
        isAvailable: false,
        isRecommended: false,
        unavailabilityReason: 'capacity_full',
      }
    }

    // Check 4: compatibilità CAP
    if (!input.isCapCompatible(customerPostalCode, existingCaps)) {
      return {
        startTime: s.startTime,
        endTime: s.endTime,
        remainingCapacity: dayConfig.ordersPerSlot - ordersInSlot.length,
        isAvailable: false,
        isRecommended: false,
        unavailabilityReason: 'cap_incompatible',
      }
    }

    return {
      startTime: s.startTime,
      endTime: s.endTime,
      remainingCapacity: dayConfig.ordersPerSlot - ordersInSlot.length,
      isAvailable: true,
      isRecommended: false,
      unavailabilityReason: null,
    }
  })

  // Step 5: primo disponibile = raccomandato
  const firstAvailable = slots.find((s) => s.isAvailable)
  if (firstAvailable) firstAvailable.isRecommended = true

  return slots
}
