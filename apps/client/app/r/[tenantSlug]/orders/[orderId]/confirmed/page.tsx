import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { Route } from 'next'
import { formatCurrency, formatDateTime, formatTime } from '@wormhole/shared'
import { getTenantBySlug } from '@/lib/tenant'
import { getCurrentCustomer } from '@/lib/session'
import { getOrderForCustomer } from '@/lib/orders'
import { TenantTheme } from '@/components/TenantTheme'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Ordine confermato' }

interface PageProps {
  params: Promise<{ tenantSlug: string; orderId: string }>
}

export default async function OrderConfirmedPage({ params }: PageProps) {
  const { tenantSlug, orderId } = await params
  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  const customer = await getCurrentCustomer(tenant.id)
  if (!customer) redirect(`/r/${tenantSlug}/onboarding` as Route)

  const order = await getOrderForCustomer(orderId, customer.id)
  if (!order) notFound()

  const menuHref = `/r/${tenantSlug}/menu` as Route

  return (
    <TenantTheme brandColor={tenant.brandColor} className="bg-muted/30 min-h-screen">
      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-8">
        <div className="text-center">
          <p className="text-5xl" aria-hidden>
            ✅
          </p>
          <h1 className="mt-2 text-2xl font-bold">Ordine #{order.orderNumber} ricevuto!</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Il ristorante sta confermando, riceverai un aggiornamento.
          </p>
        </div>

        <div className="border-border bg-background rounded-xl border p-5 text-center">
          <p className="text-muted-foreground text-sm">Il tuo codice di consegna</p>
          <p className="text-primary mt-1 font-mono text-4xl font-bold tracking-widest">
            {order.deliveryCode}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">Il rider te lo chiederà.</p>
        </div>

        <div className="border-border bg-background flex flex-col gap-2 rounded-xl border p-4 text-sm">
          <Row label="Consegna prevista" value={formatTime(order.scheduledSlot)} />
          <Row label="Indirizzo" value={`${order.deliveryAddress.street}, ${order.deliveryPostalCode}`} />
          <div className="border-border my-1 border-t" />
          <Row label="Subtotale" value={formatCurrency(order.subtotalCents)} />
          <Row label="Consegna" value={formatCurrency(order.deliveryFeeCents)} />
          <Row label="Totale" value={formatCurrency(order.totalCents)} bold />
          {order.customerPayingWithCents != null ? (
            <>
              <Row label="Paghi con" value={formatCurrency(order.customerPayingWithCents)} />
              <Row label="Resto" value={formatCurrency(order.changeToGiveCents ?? 0)} />
            </>
          ) : null}
          <p className="text-muted-foreground mt-1 text-xs">
            Ordine del {formatDateTime(order.createdAt)} • 💵 pagamento alla consegna
          </p>
        </div>

        <Link
          href={menuHref}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-12 items-center justify-center rounded-md px-6 font-medium"
        >
          Torna al menu
        </Link>
      </main>
    </TenantTheme>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${bold ? 'text-base font-bold' : ''}`}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}
