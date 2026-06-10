import { notFound } from 'next/navigation'
import { getTenantBySlug, getServedPostalCodes } from '@/lib/tenant'
import { TenantTheme } from '@/components/TenantTheme'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function OnboardingPage({ params }: PageProps) {
  const { tenantSlug } = await params
  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  const caps = await getServedPostalCodes(tenant.id)
  const servedCaps = caps.map((c) => ({
    postalCode: c.postalCode,
    city: c.city,
    deliveryFeeCents: c.deliveryFeeCents,
  }))

  return (
    <TenantTheme brandColor={tenant.brandColor} className="bg-muted/30 min-h-screen">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-4 sm:p-8">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">{tenant.name}</p>
        </div>
        <OnboardingFlow tenantSlug={tenantSlug} servedCaps={servedCaps} />
      </main>
    </TenantTheme>
  )
}
