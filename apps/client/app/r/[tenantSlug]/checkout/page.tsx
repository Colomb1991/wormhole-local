import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { Route } from 'next'
import { getTenantBySlug, getServedPostalCodes } from '@/lib/tenant'
import { getCurrentCustomer } from '@/lib/session'
import { TenantTheme } from '@/components/TenantTheme'
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Checkout' }

interface PageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function CheckoutPage({ params }: PageProps) {
  const { tenantSlug } = await params
  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  // Serve un cliente identificato: senza sessione torna all'onboarding.
  const customer = await getCurrentCustomer(tenant.id)
  if (!customer) {
    redirect(`/r/${tenantSlug}/onboarding` as Route)
  }

  const caps = await getServedPostalCodes(tenant.id)
  const servedCaps = caps.map((c) => ({
    postalCode: c.postalCode,
    city: c.city,
    deliveryFeeCents: c.deliveryFeeCents,
  }))

  const addr = customer.defaultAddress
  const prefill = {
    street: addr?.street ?? '',
    buildingNumber: addr?.buildingNumber ?? '',
    postalCode: addr?.postalCode ?? '',
    notes: addr?.notes ?? '',
  }

  return (
    <TenantTheme brandColor={tenant.brandColor} className="bg-muted/30 min-h-screen">
      <main className="mx-auto max-w-md px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Completa l&apos;ordine</h1>
        <CheckoutFlow
          tenantSlug={tenantSlug}
          servedCaps={servedCaps}
          minOrderAmountCents={tenant.config.minOrderAmountCents}
          prepTimeBufferPerItem={tenant.config.prepTimeBufferPerItem}
          maxCashChangeCents={tenant.config.maxCashChangeCents}
          prefill={prefill}
        />
      </main>
    </TenantTheme>
  )
}
