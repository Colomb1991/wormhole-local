import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRestaurantStatus, type RestaurantStatusConfig } from '@wormhole/core'
import { nowInRomeTz } from '@wormhole/shared'
import { getTenantBySlug } from '@/lib/tenant'
import { getTenantPaused } from '@/lib/menu'
import { TenantTheme } from '@/components/TenantTheme'
import { CartView } from '@/components/cart/CartView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Carrello' }

interface PageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function CartPage({ params }: PageProps) {
  const { tenantSlug } = await params
  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  const isPaused = await getTenantPaused(tenant.id)
  const statusConfig: RestaurantStatusConfig = {
    weeklySchedule: tenant.config.weeklySchedule,
    deliveryWindowStart: tenant.config.deliveryWindowStart,
    deliveryWindowEnd: tenant.config.deliveryWindowEnd,
    minOrderAmountCents: tenant.config.minOrderAmountCents,
  }
  const status = getRestaurantStatus(statusConfig, nowInRomeTz(), isPaused)

  return (
    <TenantTheme brandColor={tenant.brandColor} className="bg-muted/30 min-h-screen">
      <main className="mx-auto max-w-md px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Il tuo carrello</h1>
        <CartView
          tenantSlug={tenantSlug}
          minOrderAmountCents={tenant.config.minOrderAmountCents}
          prepTimeBufferPerItem={tenant.config.prepTimeBufferPerItem}
          acceptingOrders={status.acceptingOrders}
          closedMessage={status.message}
        />
      </main>
    </TenantTheme>
  )
}
