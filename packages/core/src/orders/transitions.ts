/**
 * Macchina a stati degli ordini (FEATURE_SPECS sez. 10.2). Logica PURA.
 *
 *   pending ──accept──> accepted ──(auto 30s)──> preparing ──> ready
 *      │                   │            │           │            │
 *      └──────reject───────┴────────────┴─ cancel ──┴────────────┤
 *                                                                ▼
 *   ready ──out──> in_delivery ──delivered──> delivered     cancelled
 *
 * `delivered` e `cancelled` sono stati terminali.
 */
import type { OrderStatusValue } from '@wormhole/shared'

/** Transizioni legali: da stato → stati raggiungibili. */
export const ORDER_TRANSITIONS: Record<OrderStatusValue, readonly OrderStatusValue[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['in_delivery', 'cancelled'],
  in_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
} as const

export function canTransition(from: OrderStatusValue, to: OrderStatusValue): boolean {
  return ORDER_TRANSITIONS[from].includes(to)
}

/** Stati che occupano capacità slot / richiedono attenzione del titolare. */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatusValue[] = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'in_delivery',
]

export function isTerminalStatus(status: OrderStatusValue): boolean {
  return ORDER_TRANSITIONS[status].length === 0
}

/**
 * Colonna timestamp dell'ordine da valorizzare quando si ENTRA in uno stato.
 * (pending usa createdAt al momento dell'insert, preparing/in_delivery non
 * hanno colonne dedicate nello schema.)
 */
export const STATUS_TIMESTAMP_FIELD: Partial<
  Record<OrderStatusValue, 'acceptedAt' | 'readyAt' | 'deliveredAt' | 'cancelledAt'>
> = {
  accepted: 'acceptedAt',
  ready: 'readyAt',
  delivered: 'deliveredAt',
  cancelled: 'cancelledAt',
}

export interface StatusChangeEntry {
  status: OrderStatusValue
  at: string // ISO timestamp
  byUserId: string | null
  reason: string | null
}

/** Costruisce la entry da appendere a `orders.status_history`. */
export function buildStatusChange(
  status: OrderStatusValue,
  byUserId: string | null,
  reason: string | null,
  now: Date
): StatusChangeEntry {
  return { status, at: now.toISOString(), byUserId, reason }
}

/**
 * Un ordine `pending` più vecchio del timeout va annullato automaticamente
 * (FEATURE_SPECS 10.3: il ristorante non ha risposto in tempo).
 */
export function isPendingExpired(createdAt: Date, timeoutMinutes: number, now: Date): boolean {
  return now.getTime() - createdAt.getTime() > timeoutMinutes * 60_000
}

/**
 * Un ordine `accepted` da più di `delaySeconds` passa automaticamente a
 * `preparing` (FEATURE_SPECS 8.4: transizione automatica dopo 30s).
 */
export function shouldAutoStartPreparing(
  acceptedAt: Date | null,
  delaySeconds: number,
  now: Date
): boolean {
  if (!acceptedAt) return false
  return now.getTime() - acceptedAt.getTime() > delaySeconds * 1000
}
