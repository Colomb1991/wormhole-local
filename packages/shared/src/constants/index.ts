/**
 * Costanti applicative, non specifiche di un tenant.
 */

export const TIMEZONE = 'Europe/Rome'

export const LOCALE = 'it-IT'

export const CURRENCY = 'EUR'

/**
 * Stati di un ordine. Devono allinearsi con il check constraint del DB.
 */
export const ORDER_STATUSES = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'in_delivery',
  'delivered',
  'cancelled',
] as const

export type OrderStatusValue = (typeof ORDER_STATUSES)[number]

/**
 * Ruoli utenti autenticati (titolari + admin).
 */
export const USER_ROLES = ['owner', 'super_admin'] as const
export type UserRoleValue = (typeof USER_ROLES)[number]

/**
 * Metodi di pagamento supportati. In v0 solo 'cash'.
 */
export const PAYMENT_METHODS = ['cash', 'card'] as const
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const
export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number]

/**
 * Soglie di sistema (defaults, override possibile per tenant via config).
 */
export const DEFAULTS = {
  MIN_ORDER_AMOUNT_CENTS: 1000, // 10€
  MAX_CASH_CHANGE_CENTS: 5000, // 50€
  SLOT_DURATION_MINUTES: 30,
  PENDING_ORDER_TIMEOUT_MIN: 5,
  CUSTOMER_CANCEL_WINDOW_MIN: 2,
  PREP_TIME_BUFFER_PER_ITEM_MIN: 1,
  DEFAULT_PREP_TIME_MIN: 10,
} as const

/**
 * Costi operativi rider (per algoritmo slot CAP compatibility).
 * Vedi FEATURE_SPECS sez. 4.5.
 */
export const RIDER_TRAVEL = {
  MINUTES_PER_KM: 3, // scooter urbano
  STOP_TIME_MINUTES: 2, // sosta per consegna
  SLOT_TIME_BUFFER_MIN: 10, // buffer oltre durata slot
} as const

/**
 * Eventi delle notifiche (mappati a `notification_log.eventType`).
 */
export const NOTIFICATION_EVENTS = [
  'order_received',
  'order_accepted',
  'order_rejected',
  'order_ready',
  'order_in_delivery',
  'order_delivered',
  'order_timeout',
  'new_order_owner', // → titolare
] as const
export type NotificationEventValue = (typeof NOTIFICATION_EVENTS)[number]
