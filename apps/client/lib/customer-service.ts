import { and, eq } from 'drizzle-orm'
import { db, customers, type Customer } from '@wormhole/database'

/**
 * Trova un customer per (tenant, telefono normalizzato E.164).
 */
export async function findCustomerByPhone(
  tenantId: string,
  phone: string
): Promise<Customer | undefined> {
  return db.query.customers.findFirst({
    where: and(eq(customers.tenantId, tenantId), eq(customers.phone, phone)),
  })
}

/**
 * Predicato di unicità del codice di consegna nel tenant. Iniettato in
 * `generateUniqueCustomerCode`.
 */
export async function deliveryCodeExists(tenantId: string, code: string): Promise<boolean> {
  const row = await db.query.customers.findFirst({
    where: and(eq(customers.tenantId, tenantId), eq(customers.deliveryCode, code)),
    columns: { id: true },
  })
  return row != null
}
