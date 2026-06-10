import { cookies } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { db, customers, customerSessions, type Customer } from '@wormhole/database'

const COOKIE_NAME = 'wh_customer_session'
const SESSION_TTL_DAYS = 30
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000

/**
 * Token di sessione cliente: 48 byte casuali in hex (96 char, entro il limite
 * di 128 della colonna).
 */
export function generateSessionToken(): string {
  return randomBytes(48).toString('hex')
}

/**
 * Crea una sessione cliente persistente: riga in `customer_sessions` + cookie
 * HttpOnly. Nessun login formale — solo identificazione tra navigazioni.
 */
export async function createCustomerSession(tenantId: string, customerId: string): Promise<void> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await db.insert(customerSessions).values({ tenantId, customerId, token, expiresAt })

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
 * Restituisce il customer della sessione corrente per questo tenant, oppure
 * null se non c'è sessione valida (assente, scaduta, o di altro tenant).
 */
export async function getCurrentCustomer(tenantId: string): Promise<Customer | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null

  const session = await db.query.customerSessions.findFirst({
    where: and(
      eq(customerSessions.token, token),
      eq(customerSessions.tenantId, tenantId),
      gt(customerSessions.expiresAt, new Date())
    ),
  })
  if (!session) return null

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, session.customerId),
  })
  return customer ?? null
}

/**
 * Cancella la sessione cliente corrente (logout). Rimuove cookie e riga DB.
 */
export async function clearCustomerSession(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (token) {
    await db.delete(customerSessions).where(eq(customerSessions.token, token))
    jar.delete(COOKIE_NAME)
  }
}
