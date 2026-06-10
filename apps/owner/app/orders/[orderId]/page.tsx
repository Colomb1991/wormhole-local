import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { Route } from 'next'
import { eq } from 'drizzle-orm'
import { db, customers } from '@wormhole/database'
import { formatCurrency, formatDateTime, formatPhoneDisplay, formatTime } from '@wormhole/shared'
import { getOwnerSession } from '@/lib/auth'
import { getOrderForTenant } from '@/lib/orders'
import { serializeOrder } from '@/lib/serialize'
import { OrderDetailClient } from '@/components/OrderDetailClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Dettaglio ordine' }

interface PageProps {
  params: Promise<{ orderId: string }>
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'In attesa',
  accepted: 'Accettato',
  preparing: 'In preparazione',
  ready: 'Pronto',
  in_delivery: 'In consegna',
  delivered: 'Consegnato',
  cancelled: 'Annullato',
}

export default async function OrderDetailPage({ params }: PageProps) {
  const session = await getOwnerSession()
  if (!session) redirect('/login')

  const { orderId } = await params
  const order = await getOrderForTenant(orderId, session.tenant.id)
  if (!order) notFound()

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, order.customerId),
  })

  const comandaHref = `/orders/${order.id}/comanda` as Route

  return (
    <main className="bg-muted/30 min-h-screen">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href={'/' as Route} className="text-muted-foreground text-sm underline">
            ← Dashboard
          </Link>
          <Link
            href={comandaHref}
            className="border-input hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            🖨️ Comanda
          </Link>
        </div>

        <h1 className="text-2xl font-bold">
          Ordine #{order.orderNumber}{' '}
          <span className="text-muted-foreground text-base font-normal">
            • {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </h1>

        {/* Cliente */}
        <section className="border-border bg-background rounded-xl border p-4 text-sm">
          <h2 className="mb-2 font-semibold">Cliente</h2>
          <p className="font-medium">{customer?.name ?? '—'}</p>
          {customer ? <p>{formatPhoneDisplay(customer.phone)}</p> : null}
          <p className="mt-1">
            Codice consegna:{' '}
            <span className="font-mono text-lg font-bold tracking-widest">
              {order.deliveryCode}
            </span>
          </p>
          <p className="text-muted-foreground mt-2">
            {order.deliveryAddress.street}
            {order.deliveryAddress.buildingNumber ? `, ${order.deliveryAddress.buildingNumber}` : ''}
            <br />
            {order.deliveryPostalCode} {order.deliveryAddress.city}
            {order.deliveryAddress.notes ? (
              <>
                <br />
                📝 {order.deliveryAddress.notes}
              </>
            ) : null}
          </p>
        </section>

        {/* Card con azioni (riusa la stessa della dashboard) */}
        <OrderDetailClient order={serializeOrder(order)} />

        {/* Dettaglio economico */}
        <section className="border-border bg-background rounded-xl border p-4 text-sm">
          <h2 className="mb-2 font-semibold">Totali</h2>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotale</span>
            <span>{formatCurrency(order.subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Consegna ({order.deliveryPostalCode})</span>
            <span>{formatCurrency(order.deliveryFeeCents)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Totale</span>
            <span>{formatCurrency(order.totalCents)}</span>
          </div>
          {order.customerPayingWithCents != null ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente paga con</span>
                <span>{formatCurrency(order.customerPayingWithCents)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>RESTO DA DARE</span>
                <span>{formatCurrency(order.changeToGiveCents ?? 0)}</span>
              </div>
            </>
          ) : null}
        </section>

        {/* Timeline */}
        <section className="border-border bg-background rounded-xl border p-4 text-sm">
          <h2 className="mb-2 font-semibold">Storico stato</h2>
          <ul className="flex flex-col gap-1.5">
            <li className="flex justify-between">
              <span>Ricevuto</span>
              <span className="text-muted-foreground">{formatDateTime(order.createdAt)}</span>
            </li>
            {order.statusHistory
              .filter((h) => h.status !== 'pending')
              .map((h, idx) => (
                <li key={idx} className="flex justify-between gap-4">
                  <span>
                    {STATUS_LABELS[h.status] ?? h.status}
                    {h.reason ? (
                      <span className="text-muted-foreground"> — {h.reason}</span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground shrink-0">{formatTime(h.at)}</span>
                </li>
              ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
