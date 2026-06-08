import { format } from 'date-fns'
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'
import { LOCALE, CURRENCY, TIMEZONE } from '../constants/index'

/**
 * Formatta un importo in centesimi come stringa locale italiana.
 *
 * @example formatCurrency(1250) // "12,50 €"
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
  }).format(cents / 100)
}

/**
 * Formatta una data con timezone Europe/Rome.
 *
 * @example formatDateTime(new Date()) // "15 mag 2026, 19:30"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatInTimeZone(d, TIMEZONE, 'd MMM yyyy, HH:mm')
}

/**
 * Formatta solo l'ora di un timestamp in Europe/Rome.
 *
 * @example formatTime(new Date(...)) // "19:30"
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatInTimeZone(d, TIMEZONE, 'HH:mm')
}

/**
 * Formatta una data senza ora.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatInTimeZone(d, TIMEZONE, 'd MMM yyyy')
}

/**
 * Restituisce la data corrente nel timezone di Roma (Date object con offset
 * applicato). Per i confronti, equivale all'ora locale italiana.
 */
export function nowInRomeTz(): Date {
  return toZonedTime(new Date(), TIMEZONE)
}

/**
 * Confronta solo la parte HH:MM di una stringa "HH:MM" con un Date.
 */
export function parseTimeOfDay(time: string, baseDate: Date): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const result = new Date(baseDate)
  result.setHours(hours ?? 0, minutes ?? 0, 0, 0)
  return result
}

/**
 * Wrapper di `format` di date-fns, esposto per casi non locale-specifici.
 */
export { format }
