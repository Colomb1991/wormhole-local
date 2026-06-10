import Link from 'next/link'
import Image from 'next/image'
import type { Route } from 'next'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import { TenantTheme } from '@/components/TenantTheme'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ tenantSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tenantSlug } = await params
  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) return { title: 'Ristorante non trovato' }
  return {
    title: tenant.name,
    description: tenant.tagline ?? `Ordina online da ${tenant.name}`,
  }
}

export default async function TenantHomePage({ params }: PageProps) {
  const { tenantSlug } = await params
  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  const onboardingHref = `/r/${tenantSlug}/onboarding` as Route

  return (
    <TenantTheme brandColor={tenant.brandColor} className="min-h-screen">
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          {tenant.logoUrl ? (
            <Image
              src={tenant.logoUrl}
              alt={tenant.name}
              width={96}
              height={96}
              className="rounded-2xl"
            />
          ) : (
            <div className="bg-primary text-primary-foreground flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold">
              {tenant.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">{tenant.name}</h1>
            {tenant.tagline ? (
              <p className="text-muted-foreground mt-2">{tenant.tagline}</p>
            ) : null}
          </div>
        </div>

        <Link
          href={onboardingHref}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-14 w-full items-center justify-center rounded-md px-6 text-lg font-semibold transition-colors"
        >
          Inizia a ordinare
        </Link>

        <Link href={onboardingHref} className="text-muted-foreground text-sm underline">
          Hai già un account? Inserisci il telefono
        </Link>
      </main>
    </TenantTheme>
  )
}
