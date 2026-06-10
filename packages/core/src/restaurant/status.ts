/**
 * Stato operativo del ristorante per l'app cliente (FEATURE_SPECS sez. 2.6).
 *
 * Funzione pura: riceve la config, l'ora corrente (già in Europe/Rome) e lo
 * stato di pausa. Decide se accettare ordini e con quale messaggio/banner.
 */
import type { DayOfWeek } from '../slots/types'
import { getDayOfWeek } from '../slots/calculator'

export type RestaurantStatusState =
  | 'paused' // titolare ha messo in pausa gli ordini
  | 'closed_today' // chiuso per giorno della settimana
  | 'before_window' // aperto oggi ma consegne non ancora iniziate
  | 'open' // dentro la finestra di consegna
  | 'after_window' // finestra di consegna terminata per oggi

export interface RestaurantStatusConfig {
  weeklySchedule: Record<DayOfWeek, { isOpen: boolean }>
  deliveryWindowStart: string // "HH:MM"
  deliveryWindowEnd: string // "HH:MM"
  minOrderAmountCents: number
}

export interface RestaurantStatus {
  state: RestaurantStatusState
  /** Se true il cliente può comporre e inviare un ordine (subito o prenotato). */
  acceptingOrders: boolean
  /** Indicatore semaforo per il banner. */
  indicator: 'green' | 'yellow' | 'red'
  message: string
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'lunedì',
  tuesday: 'martedì',
  wednesday: 'mercoledì',
  thursday: 'giovedì',
  friday: 'venerdì',
  saturday: 'sabato',
  sunday: 'domenica',
}

const DAY_ORDER: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function formatEuro(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')}€`
}

/**
 * Trova il prossimo giorno aperto a partire da `from` (escluso `from` stesso se
 * `includeToday` è false). Restituisce il nome del giorno o null se nessun
 * giorno è aperto in config.
 */
function findNextOpenDay(
  weeklySchedule: RestaurantStatusConfig['weeklySchedule'],
  fromDayIndex: number,
  includeToday: boolean
): DayOfWeek | null {
  for (let offset = includeToday ? 0 : 1; offset <= 7; offset++) {
    const day = DAY_ORDER[(fromDayIndex + offset) % 7]!
    if (weeklySchedule[day].isOpen) return day
  }
  return null
}

export function getRestaurantStatus(
  config: RestaurantStatusConfig,
  now: Date,
  isPaused: boolean
): RestaurantStatus {
  const minOrder = formatEuro(config.minOrderAmountCents)

  if (isPaused) {
    return {
      state: 'paused',
      acceptingOrders: false,
      indicator: 'red',
      message: 'Temporaneamente non accettiamo ordini • Riprova più tardi',
    }
  }

  const today = getDayOfWeek(now)
  if (!config.weeklySchedule[today].isOpen) {
    const next = findNextOpenDay(config.weeklySchedule, now.getDay(), false)
    const reopen = next
      ? ` • Riapre ${DAY_LABELS[next]} alle ${config.deliveryWindowStart}`
      : ''
    return {
      state: 'closed_today',
      acceptingOrders: false,
      indicator: 'red',
      message: `Chiuso il ${DAY_LABELS[today]}${reopen}`,
    }
  }

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const startMin = toMinutes(config.deliveryWindowStart)
  const endMin = toMinutes(config.deliveryWindowEnd)

  if (nowMin < startMin) {
    return {
      state: 'before_window',
      acceptingOrders: true,
      indicator: 'yellow',
      message: `Le consegne iniziano alle ${config.deliveryWindowStart} • Puoi prenotare ora`,
    }
  }

  if (nowMin >= endMin) {
    return {
      state: 'after_window',
      acceptingOrders: false,
      indicator: 'red',
      message: 'Consegne terminate per oggi • Torna domani',
    }
  }

  return {
    state: 'open',
    acceptingOrders: true,
    indicator: 'green',
    message: `Aperto • Consegna ${config.deliveryWindowStart}–${config.deliveryWindowEnd} • Min. ${minOrder}`,
  }
}
