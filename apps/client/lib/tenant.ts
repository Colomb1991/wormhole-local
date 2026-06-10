import { cache } from 'react'
import { and, asc, eq } from 'drizzle-orm'
import { db, tenants, tenantPostalCodes, type Tenant, type TenantPostalCode } from '@wormhole/database'

/**
 * Carica un tenant dal suo slug. Memoizzato per-richiesta con `cache()` di
 * React: chiamarlo in più punti dello stesso render fa una sola query.
 */
export const getTenantBySlug = cache(async (slug: string): Promise<Tenant | undefined> => {
  return db.query.tenants.findFirst({ where: eq(tenants.slug, slug) })
})

/**
 * CAP serviti dal tenant, ordinati per codice. Usati nel dropdown di
 * onboarding e checkout (FEATURE_SPECS sez. 5.3).
 */
export const getServedPostalCodes = cache(
  async (tenantId: string): Promise<TenantPostalCode[]> => {
    return db.query.tenantPostalCodes.findMany({
      where: and(eq(tenantPostalCodes.tenantId, tenantId), eq(tenantPostalCodes.isServed, true)),
      orderBy: asc(tenantPostalCodes.postalCode),
    })
  }
)
