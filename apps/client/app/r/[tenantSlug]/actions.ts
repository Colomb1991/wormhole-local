'use server'

import { ok, err, type Result, customerRegistrationSchema } from '@wormhole/shared'
import { tryNormalizePhone, buildCustomerInsert, generateUniqueCustomerCode } from '@wormhole/core'
import { db, customers } from '@wormhole/database'
import { getTenantBySlug } from '@/lib/tenant'
import { findCustomerByPhone, deliveryCodeExists } from '@/lib/customer-service'
import { createCustomerSession } from '@/lib/session'

export type IdentifyResult =
  | { found: true; name: string; deliveryCode: string }
  | { found: false; phone: string }

/**
 * Step 2 onboarding: identifica un cliente dal telefono.
 * - se esiste: crea sessione e restituisce nome + codice consegna
 * - se non esiste: restituisce il telefono normalizzato per pre-compilare la
 *   registrazione
 */
export async function identifyCustomerAction(input: {
  tenantSlug: string
  phone: string
}): Promise<Result<IdentifyResult>> {
  const tenant = await getTenantBySlug(input.tenantSlug)
  if (!tenant) return err('Ristorante non trovato', 'TENANT_NOT_FOUND')

  const parsed = tryNormalizePhone(input.phone)
  if (!parsed.ok) {
    return err('Numero di telefono non valido. Es. 333 1234567', 'INVALID_PHONE')
  }

  const existing = await findCustomerByPhone(tenant.id, parsed.phone)
  if (existing) {
    await createCustomerSession(tenant.id, existing.id)
    return ok({ found: true, name: existing.name, deliveryCode: existing.deliveryCode })
  }

  return ok({ found: false, phone: parsed.phone })
}

export interface RegisterCustomerInput {
  tenantSlug: string
  phone: string
  name: string
  email?: string
  address: {
    street: string
    postalCode: string
    city: string
    buildingNumber?: string | null
    notes?: string | null
  }
  hasConsentedDataStorage: boolean
}

/**
 * Step 3b onboarding: registra un nuovo cliente, genera il codice di consegna
 * univoco, crea la sessione e restituisce il codice da mostrare.
 */
export async function registerCustomerAction(
  input: RegisterCustomerInput
): Promise<Result<{ deliveryCode: string; isExisting: boolean }>> {
  const tenant = await getTenantBySlug(input.tenantSlug)
  if (!tenant) return err('Ristorante non trovato', 'TENANT_NOT_FOUND')

  // Validazione centralizzata (telefono già E.164, indirizzo, consenso...).
  const parsed = customerRegistrationSchema.safeParse({
    phone: input.phone,
    name: input.name,
    email: input.email ?? '',
    address: input.address,
    hasConsentedDataStorage: input.hasConsentedDataStorage,
  })
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return err(firstIssue?.message ?? 'Dati non validi', 'VALIDATION_ERROR')
  }
  const data = parsed.data

  // Idempotenza/anti doppio-submit: se il telefono esiste già, logga il cliente
  // esistente invece di creare un duplicato (il vincolo UNIQUE lo impedirebbe).
  const existing = await findCustomerByPhone(tenant.id, data.phone)
  if (existing) {
    await createCustomerSession(tenant.id, existing.id)
    return ok({ deliveryCode: existing.deliveryCode, isExisting: true })
  }

  const deliveryCode = await generateUniqueCustomerCode((code) =>
    deliveryCodeExists(tenant.id, code)
  )

  const values = buildCustomerInsert({
    tenantId: tenant.id,
    phone: data.phone,
    name: data.name,
    email: data.email,
    address: data.address,
    hasConsentedDataStorage: data.hasConsentedDataStorage,
    deliveryCode,
  })

  const [created] = await db.insert(customers).values(values).returning()
  if (!created) return err('Creazione profilo fallita, riprova', 'INSERT_FAILED')

  await createCustomerSession(tenant.id, created.id)
  return ok({ deliveryCode, isExisting: false })
}
