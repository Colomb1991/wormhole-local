import { cache } from 'react'
import { cookies } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import {
  db,
  users,
  userSessions,
  tenantUsers,
  tenants,
  type User,
  type Tenant,
} from '@wormhole/database'

const COOKIE_NAME = 'wh_owner_session'
const SESSION_TTL_DAYS = 30
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000

export interface OwnerSession {
  user: User
  tenant: Tenant
}

/**
 * Crea la sessione titolare: riga in `user_sessions` + cookie HttpOnly.
 */
export async function createOwnerSession(userId: string, tenantId: string): Promise<void> {
  const token = randomBytes(48).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await db.insert(userSessions).values({ userId, tenantId, token, expiresAt })

  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

/**
 * Sessione corrente del titolare (utente attivo + tenant), o null.
 * Memoizzata per-richiesta: pagina e action nello stesso render non
 * ripetono le query.
 */
export const getOwnerSession = cache(async (): Promise<OwnerSession | null> => {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null

  const session = await db.query.userSessions.findFirst({
    where: and(eq(userSessions.token, token), gt(userSessions.expiresAt, new Date())),
  })
  if (!session) return null

  const [user, tenant] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, session.userId) }),
    db.query.tenants.findFirst({ where: eq(tenants.id, session.tenantId) }),
  ])
  if (!user || !user.isActive || !tenant) return null

  return { user, tenant }
})

/**
 * Logout: rimuove riga sessione e cookie.
 */
export async function clearOwnerSession(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (token) {
    await db.delete(userSessions).where(eq(userSessions.token, token))
    jar.delete(COOKIE_NAME)
  }
}

/**
 * Primo tenant associato a un utente (per ora relazione 1:1).
 */
export async function getFirstTenantIdForUser(userId: string): Promise<string | null> {
  const link = await db.query.tenantUsers.findFirst({
    where: eq(tenantUsers.userId, userId),
  })
  return link?.tenantId ?? null
}
