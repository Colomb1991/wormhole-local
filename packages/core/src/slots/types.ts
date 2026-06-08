export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface DayScheduleConfig {
  isOpen: boolean
  riderCount: number
  ordersPerSlot: number
}

export interface TenantSlotConfig {
  slotDurationMinutes: 15 | 20 | 30
  deliveryWindowStart: string // "HH:MM"
  deliveryWindowEnd: string // "HH:MM"
  weeklySchedule: Record<DayOfWeek, DayScheduleConfig>
}

export type SlotUnavailabilityReason =
  | 'past_time'
  | 'prep_time_exceeds'
  | 'capacity_full'
  | 'cap_incompatible'
  | 'restaurant_closed'

export interface TheoreticalSlot {
  startTime: Date
  endTime: Date
}

export interface AvailableSlot {
  startTime: Date
  endTime: Date
  remainingCapacity: number
  isAvailable: boolean
  isRecommended: boolean
  unavailabilityReason: SlotUnavailabilityReason | null
}

/**
 * Riepilogo di un ordine già accettato in uno slot, usato per controllare
 * capacità e compatibilità CAP.
 */
export interface SlotOrderSummary {
  deliveryPostalCode: string
}

export interface SlotCalculatorInput {
  customerPostalCode: string
  cartPrepTimeMinutes: number
  currentTime: Date
  config: TenantSlotConfig
  /**
   * Mapping slot-startTime → ordini già accettati in quello slot.
   * Pre-caricato dal chiamante.
   */
  ordersByStartTime: Map<string, SlotOrderSummary[]>
  /**
   * Calcolatore di compatibilità CAP. Ricava la decisione dalla matrice
   * distanze e dalla config rider. Iniettato per testabilità.
   *
   * Restituisce `true` se aggiungere `newCap` allo slot esistente non
   * supera il tempo massimo del rider.
   */
  isCapCompatible: (newCap: string, existingCaps: string[]) => boolean
}
