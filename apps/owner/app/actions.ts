'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { ok, err, type Result } from '@wormhole/shared'
import type { OrderStatusValue } from '@wormhole/shared'
import { verifyPassword } from '@wormhole/core/auth/password'
import { db, users, tenantPauseState } from '@wormhole/database'
import {
  createOwnerSession,
  clearOwnerSession,
  getOwnerSession,
  getFirstTenantIdForUser,
} from '@/lib/auth'
import {
  applyOrderTransition,
  getBoardOrders,
  getOrderForTenant,
  sweepStaleOrders,
} from '@/lib/orders'
import { serializeOrder, type SerializedOrder } from '@/lib/serialize'

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function loginAction(input: {
  email: string
  password: string
}): Promise<Result<{ redirectTo: string }>> {
  const email = input.email.trim().toLowerCase()
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })

  // Messaggio identico per utente inesistente e password errata.
  if (!user || !user.isActive || !verifyPassword(input.password, user.passwordHash)) {
    return err('Email o password non corretti', 'BAD_CREDENTIALS')
  }

  const tenantId = await getFirstTenantIdForUser(user.id)
  if (!tenantId) return err('Nessun ristorante associato a questo utente', 'NO_TENANT')

  await createOwnerSession(user.id, tenantId)
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))

  return ok({ redirectTo: '/' })
}

export async function logoutAction(): Promise<void> {
  await clearOwnerSession()
  redirect('/login')
}

// ---------------------------------------------------------------------------
// Board (polling)
// ---------------------------------------------------------------------------

export interface BoardData {
  orders: SerializedOrder[]
  isPaused: boolean
  nowIso: string
}

/**
 * Snapshot della dashboard. A ogni fetch esegue anche la manutenzione lazy
 * (timeout pending, auto-preparing) — niente job esterni.
 */
export async function fetchBoardAction(): Promise<Result<BoardData>> {
  const session = await getOwnerSession()
  if (!session) return err('Sessione scaduta', 'UNAUTHORIZED')

  await sweepStaleOrders(session.tenant.id, session.tenant.config.pendingOrderTimeoutMinutes)

  const [rows, pauseRow] = await Promise.all([
    getBoardOrders(session.tenant.id),
    db.query.tenantPauseState.findFirst({
      where: eq(tenantPauseState.tenantId, session.tenant.id),
      columns: { isPaused: true },
    }),
  ])

  return ok({
    orders: rows.map(serializeOrder),
    isPaused: pauseRow?.isPaused ?? false,
    nowIso: new Date().toISOString(),
  })
}

// ---------------------------------------------------------------------------
// Transizioni ordine
// ---------------------------------------------------------------------------

async function transition(
  orderId: string,
  to: OrderStatusValue,
  reason?: string | null
): Promise<Result<SerializedOrder>> {
  const session = await getOwnerSession()
  if (!session) return err('Sessione scaduta', 'UNAUTHORIZED')

  const res = await applyOrderTransition({
    orderId,
    tenantId: session.tenant.id,
    to,
    byUserId: session.user.id,
    reason: reason ?? null,
  })
  if (!res.ok) return err(res.error, res.code)
  return ok(serializeOrder(res.order))
}

export async function acceptOrderAction(orderId: string): Promise<Result<SerializedOrder>> {
  return transition(orderId, 'accepted')
}

export async function rejectOrderAction(
  orderId: string,
  reason: string
): Promise<Result<SerializedOrder>> {
  return transition(orderId, 'cancelled', reason.trim() || 'Rifiutato dal ristorante')
}

export async function markReadyAction(orderId: string): Promise<Result<SerializedOrder>> {
  return transition(orderId, 'ready')
}

export async function markInDeliveryAction(orderId: string): Promise<Result<SerializedOrder>> {
  return transition(orderId, 'in_delivery')
}

/**
 * Consegnato: richiede il codice di consegna a 4-5 cifre del cliente
 * (verifica identità alla porta, FEATURE_SPECS sez. 6.4).
 */
export async function markDeliveredAction(
  orderId: string,
  deliveryCodeInput: string
): Promise<Result<SerializedOrder>> {
  const session = await getOwnerSession()
  if (!session) return err('Sessione scaduta', 'UNAUTHORIZED')

  const order = await getOrderForTenant(orderId, session.tenant.id)
  if (!order) return err('Ordine non trovato', 'NOT_FOUND')

  if (deliveryCodeInput.trim() !== order.deliveryCode) {
    return err('Codice di consegna errato', 'BAD_DELIVERY_CODE')
  }

  return transition(orderId, 'delivered')
}

export async function cancelOrderAction(
  orderId: string,
  reason: string
): Promise<Result<SerializedOrder>> {
  return transition(orderId, 'cancelled', reason.trim() || 'Annullato dal ristorante')
}

// ---------------------------------------------------------------------------
// Pausa ordini
// ---------------------------------------------------------------------------

export async function setPauseAction(paused: boolean): Promise<Result<{ isPaused: boolean }>> {
  const session = await getOwnerSession()
  if (!session) return err('Sessione scaduta', 'UNAUTHORIZED')

  const now = new Date()
  await db
    .insert(tenantPauseState)
    .values({
      tenantId: session.tenant.id,
      isPaused: paused,
      pausedAt: paused ? now : null,
      resumedAt: paused ? null : now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: tenantPauseState.tenantId,
      set: {
        isPaused: paused,
        ...(paused ? { pausedAt: now } : { resumedAt: now }),
        updatedAt: now,
      },
    })

  return ok({ isPaused: paused })
}
