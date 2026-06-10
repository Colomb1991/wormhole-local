import { and, desc, eq, gte, inArray, lt, or } from 'drizzle-orm'
import { db, orders, type Order, type OrderStatus } from '@wormhole/database'
import {
  ACTIVE_ORDER_STATUSES,
  buildStatusChange,
  canTransition,
  isPendingExpired,
  shouldAutoStartPreparing,
  STATUS_TIMESTAMP_FIELD,
} from '@wormhole/core'
import type { OrderStatusValue } from '@wormhole/shared'

/** Secondi dopo l'accettazione prima del passaggio automatico a preparing. */
const AUTO_PREPARING_DELAY_SECONDS = 30

/** Inizio del giorno corrente in Europe/Rome, come istante UTC. */
export function startOfTodayRome(now = new Date()): Date {
  const romeDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' }) // YYYY-MM-DD
  // Offset di Roma all'istante attuale (gestisce CET/CEST).
  const romeAsUtc = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Rome' }))
  const offsetMs = now.getTime() - romeAsUtc.getTime()
  return new Date(new Date(`${romeDateStr}T00:00:00.000Z`).getTime() + offsetMs)
}

/**
 * Ordini per la dashboard: tutti gli attivi (qualunque giorno) + i chiusi
 * (delivered/cancelled) di oggi.
 */
export async function getBoardOrders(tenantId: string): Promise<Order[]> {
  const todayStart = startOfTodayRome()
  return db.query.orders.findMany({
    where: and(
      eq(orders.tenantId, tenantId),
      or(
        inArray(orders.status, [...ACTIVE_ORDER_STATUSES] as OrderStatus[]),
        gte(orders.createdAt, todayStart)
      )
    ),
    orderBy: [desc(orders.createdAt)],
  })
}

export async function getOrderForTenant(
  orderId: string,
  tenantId: string
): Promise<Order | undefined> {
  return db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)),
  })
}

/** Storico: ordini chiusi, più recenti prima. */
export async function getHistoryOrders(tenantId: string, limit = 100): Promise<Order[]> {
  return db.query.orders.findMany({
    where: and(
      eq(orders.tenantId, tenantId),
      inArray(orders.status, ['delivered', 'cancelled'] as OrderStatus[])
    ),
    orderBy: [desc(orders.createdAt)],
    limit,
  })
}

export type TransitionResult =
  | { ok: true; order: Order }
  | { ok: false; error: string; code: string }

/**
 * Applica una transizione di stato verificandola con la macchina a stati di
 * core. Append su status_history + timestamp dedicato dello stato.
 *
 * Guardia anti-race: l'UPDATE filtra anche sullo stato di partenza letto —
 * se nel frattempo qualcun altro ha cambiato stato, nessuna riga aggiornata.
 */
export async function applyOrderTransition(params: {
  orderId: string
  tenantId: string
  to: OrderStatusValue
  byUserId: string | null
  reason?: string | null
}): Promise<TransitionResult> {
  const order = await getOrderForTenant(params.orderId, params.tenantId)
  if (!order) return { ok: false, error: 'Ordine non trovato', code: 'NOT_FOUND' }

  if (!canTransition(order.status, params.to)) {
    return {
      ok: false,
      error: `Transizione non consentita: ${order.status} → ${params.to}`,
      code: 'ILLEGAL_TRANSITION',
    }
  }

  const now = new Date()
  const entry = buildStatusChange(params.to, params.byUserId, params.reason ?? null, now)

  const updates: Partial<typeof orders.$inferInsert> = {
    status: params.to as OrderStatus,
    statusHistory: [...order.statusHistory, entry],
    updatedAt: now,
  }
  const tsField = STATUS_TIMESTAMP_FIELD[params.to]
  if (tsField) updates[tsField] = now
  if (params.to === 'cancelled' && params.reason) updates.rejectionReason = params.reason

  const [updated] = await db
    .update(orders)
    .set(updates)
    .where(
      and(
        eq(orders.id, order.id),
        eq(orders.tenantId, params.tenantId),
        eq(orders.status, order.status) // guardia ottimistica
      )
    )
    .returning()

  if (!updated) {
    return { ok: false, error: 'Ordine modificato da un altro dispositivo, ricarica', code: 'CONFLICT' }
  }
  return { ok: true, order: updated }
}

/**
 * Manutenzione lazy eseguita a ogni fetch della board (niente job esterni):
 *  - pending oltre il timeout → cancelled automatico (FEATURE_SPECS 10.3)
 *  - accepted da più di 30s → preparing (FEATURE_SPECS 8.4)
 *
 * Restituisce quanti ordini sono stati toccati (per log/debug).
 */
export async function sweepStaleOrders(
  tenantId: string,
  pendingTimeoutMinutes: number
): Promise<{ expired: number; autoPreparing: number }> {
  const now = new Date()
  let expired = 0
  let autoPreparing = 0

  // Candidati: pochi ordini per volta, query mirate.
  const pendingCutoff = new Date(now.getTime() - pendingTimeoutMinutes * 60_000)
  const stalePending = await db.query.orders.findMany({
    where: and(
      eq(orders.tenantId, tenantId),
      eq(orders.status, 'pending' as OrderStatus),
      lt(orders.createdAt, pendingCutoff)
    ),
  })
  for (const o of stalePending) {
    if (!isPendingExpired(o.createdAt, pendingTimeoutMinutes, now)) continue
    const res = await applyOrderTransition({
      orderId: o.id,
      tenantId,
      to: 'cancelled',
      byUserId: null,
      reason: 'timeout: il ristorante non ha risposto in tempo',
    })
    if (res.ok) expired++
  }

  const acceptedCutoff = new Date(now.getTime() - AUTO_PREPARING_DELAY_SECONDS * 1000)
  const staleAccepted = await db.query.orders.findMany({
    where: and(
      eq(orders.tenantId, tenantId),
      eq(orders.status, 'accepted' as OrderStatus),
      lt(orders.acceptedAt, acceptedCutoff)
    ),
  })
  for (const o of staleAccepted) {
    if (!shouldAutoStartPreparing(o.acceptedAt, AUTO_PREPARING_DELAY_SECONDS, now)) continue
    const res = await applyOrderTransition({
      orderId: o.id,
      tenantId,
      to: 'preparing',
      byUserId: null,
      reason: 'auto dopo accettazione',
    })
    if (res.ok) autoPreparing++
  }

  return { expired, autoPreparing }
}
