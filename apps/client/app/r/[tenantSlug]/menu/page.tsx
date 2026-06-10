import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRestaurantStatus, type RestaurantStatusConfig } from '@wormhole/core'
import { nowInRomeTz } from '@wormhole/shared'
import { getTenantBySlug } from '@/lib/tenant'
import { getMenuForTenant, getTenantPaused } from '@/lib/menu'
import { TenantTheme } from '@/components/TenantTheme'
import { MenuView } from '@/components/menu/MenuView'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ tenantSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tenantSlug } = await params
  const tenant = await getTenantBySlug(tenantSlug)
  return { title: tenant ? `Menu — ${tenant.name}` : 'Menu' }
}

export default async function MenuPage({ params }: PageProps) {
  const { tenantSlug } = await params
  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  const [menu, isPaused] = await Promise.all([
    getMenuForTenant(tenant.id),
    getTenantPaused(tenant.id),
  ])

  const statusConfig: RestaurantStatusConfig = {
    weeklySchedule: tenant.config.weeklySchedule,
    deliveryWindowStart: tenant.config.deliveryWindowStart,
    deliveryWindowEnd: tenant.config.deliveryWindowEnd,
    minOrderAmountCents: tenant.config.minOrderAmountCents,
  }
  const status = getRestaurantStatus(statusConfig, nowInRomeTz(), isPaused)

  const categories = menu.map((c) => ({
    id: c.id,
    name: c.name,
    items: c.items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      priceCents: i.priceCents,
      prepTimeMinutes: i.prepTimeMinutes,
      isAvailable: i.isAvailable,
      menuNumber: i.menuNumber,
    })),
  }))

  return (
    <TenantTheme brandColor={tenant.brandColor} className="bg-background min-h-screen">
      <MenuView
        tenantSlug={tenantSlug}
        tenantName={tenant.name}
        categories={categories}
        status={status}
      />
    </TenantTheme>
  )
}
