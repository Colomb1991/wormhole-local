import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { Route } from 'next'
import { eq, inArray } from 'drizzle-orm'
import { db, customers, menuItems } from '@wormhole/database'
import { calculatePrepTime } from '@wormhole/core'
import { formatCurrency, formatDateTime, formatPhoneDisplay, formatTime } from '@wormhole/shared'
import { getOwnerSession } from '@/lib/auth'
import { getOrderForTenant } from '@/lib/orders'
import { PrintButton } from '@/components/PrintButton'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Comanda' }

interface PageProps {
  params: Promise<{ orderId: string }>
}

export default async function ComandaPage({ params }: PageProps) {
  const session = await getOwnerSession()
  if (!session) redirect('/login')

  const { orderId } = await params
  const order = await getOrderForTenant(orderId, session.tenant.id)
  if (!order) notFound()

  const tenant = session.tenant

  const [customer, dbItems] = await Promise.all([
    db.query.customers.findFirst({ where: eq(customers.id, order.customerId) }),
    order.items.length > 0
      ? db.query.menuItems.findMany({
          where: inArray(
            menuItems.id,
            order.items.map((i) => i.menuItemId)
          ),
          columns: { id: true, menuNumber: true, vatRate: true },
        })
      : Promise.resolve([]),
  ])

  // menu_number e IVA non sono nello snapshot dell'ordine: lookup sul menu
  // attuale (per piatti eliminati nel frattempo restano vuoti).
  const metaById = new Map(dbItems.map((i) => [i.id, i]))

  const prepTime = calculatePrepTime(
    order.items.map((i) => ({
      menuItemId: i.menuItemId,
      name: i.name,
      unitPriceCents: i.unitPriceCents,
      prepTimeMinutes: i.prepTimeMinutes,
      quantity: i.quantity,
    })),
    { prepTimeBufferPerItem: tenant.config.prepTimeBufferPerItem }
  )

  // IVA inclusa nei prezzi: scorporo per aliquota (solo piatti).
  const vatTotals = new Map<number, number>()
  for (const item of order.items) {
    const rate = metaById.get(item.menuItemId)?.vatRate ?? 10
    const included = Math.round((item.totalCents * rate) / (100 + rate))
    vatTotals.set(rate, (vatTotals.get(rate) ?? 0) + included)
  }

  const divider = '='.repeat(32)

  return (
    <main className="comanda-page min-h-screen bg-white text-black">
      <div className="no-print mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link
          href={`/orders/${order.id}` as Route}
          className="text-sm text-neutral-500 underline"
        >
          ← Dettaglio
        </Link>
        <PrintButton />
      </div>

      <pre className="comanda mx-auto max-w-md whitespace-pre-wrap px-4 pb-8 font-mono text-[13px] leading-snug">
        {divider}
        {'\n'}
        <span className="block text-center text-base font-bold">{tenant.name}</span>
        <span className="block text-center">{tenant.address}</span>
        <span className="block text-center">
          {tenant.postalCode} {tenant.city}
        </span>
        {divider}
        {'\n\n'}
        <span className="text-lg font-bold">ORDINE #{order.orderNumber}</span>
        {'\n'}
        {formatDateTime(order.createdAt)}
        {'\n'}
        <span className="font-bold">Slot consegna: {formatTime(order.scheduledSlot)}</span>
        {'\n\n'}
        {divider}
        {'\n'}
        CLIENTE:{'\n'}
        <span className="font-bold">{customer?.name ?? '—'}</span>
        {'\n'}
        {customer ? formatPhoneDisplay(customer.phone) : ''}
        {'\n'}
        <span className="font-bold">Cod. consegna: {order.deliveryCode}</span>
        {'\n\n'}
        INDIRIZZO:{'\n'}
        {order.deliveryAddress.street}
        {order.deliveryAddress.buildingNumber ? `, ${order.deliveryAddress.buildingNumber}` : ''}
        {'\n'}
        {order.deliveryPostalCode} {order.deliveryAddress.city}
        {'\n'}
        {order.deliveryAddress.notes ? `Note: ${order.deliveryAddress.notes}\n` : ''}
        {order.customerNotes ? `Note ordine: ${order.customerNotes}\n` : ''}
        {divider}
        {'\n'}
        PIATTI:{'\n\n'}
        {order.items.map((item) => {
          const num = metaById.get(item.menuItemId)?.menuNumber
          return (
            <span key={item.menuItemId} className="block">
              <span className="font-bold">
                {item.quantity}x {num ? `[${num}] ` : ''}
                {item.name}
              </span>
              {'  '}
              {formatCurrency(item.totalCents)}
              {'\n'}
              {`   (prep ${item.prepTimeMinutes}min)`}
              {'\n'}
            </span>
          )
        })}
        {'\n'}
        {divider}
        {'\n'}
        {`Subtotale:           ${formatCurrency(order.subtotalCents)}`}
        {'\n'}
        {`Consegna (${order.deliveryPostalCode}): ${formatCurrency(order.deliveryFeeCents)}`}
        {'\n'}
        {divider}
        {'\n'}
        <span className="text-base font-bold">{`TOTALE:              ${formatCurrency(order.totalCents)}`}</span>
        {'\n'}
        {[...vatTotals.entries()]
          .sort(([a], [b]) => a - b)
          .map(([rate, cents]) => `di cui IVA ${rate}%:      ${formatCurrency(cents)}\n`)
          .join('')}
        (prezzi IVA inclusa){'\n\n'}
        💵 PAGAMENTO ALLA CONSEGNA{'\n'}
        {`Da incassare:        ${formatCurrency(order.totalCents)}`}
        {'\n'}
        {order.customerPayingWithCents != null
          ? `Cliente paga con:    ${formatCurrency(order.customerPayingWithCents)}\n` +
            `RESTO DA DARE:       ${formatCurrency(order.changeToGiveCents ?? 0)}\n`
          : ''}
        {'\n'}
        {divider}
        {'\n'}
        Tempo prep totale: {prepTime} min{'\n'}
        {divider}
      </pre>

      {/* Stampa: solo la comanda, larghezza 80mm */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .comanda { max-width: 80mm; padding: 0; margin: 0; font-size: 11px; }
          @page { margin: 4mm; }
        }
      `}</style>
    </main>
  )
}
