import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { Route } from 'next'
import { formatCurrency, formatDate, formatTime } from '@wormhole/shared'
import { getOwnerSession } from '@/lib/auth'
import { getHistoryOrders } from '@/lib/orders'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Storico ordini' }

export default async function HistoryPage() {
  const session = await getOwnerSession()
  if (!session) redirect('/login')

  const rows = await getHistoryOrders(session.tenant.id)

  // Raggruppa per giorno (Europe/Rome) mantenendo l'ordine dal più recente.
  const byDay = new Map<string, typeof rows>()
  for (const o of rows) {
    const day = formatDate(o.createdAt)
    const list = byDay.get(day) ?? []
    list.push(o)
    byDay.set(day, list)
  }

  return (
    <main className="bg-muted/30 min-h-screen">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href={'/' as Route} className="text-muted-foreground text-sm underline">
            ← Dashboard
          </Link>
          <h1 className="text-lg font-bold">Storico ordini</h1>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Nessun ordine chiuso finora.
          </p>
        ) : (
          [...byDay.entries()].map(([day, dayOrders]) => {
            const revenue = dayOrders
              .filter((o) => o.status === 'delivered')
              .reduce((sum, o) => sum + o.totalCents, 0)
            return (
              <section key={day}>
                <h2 className="mb-2 flex items-baseline justify-between text-sm font-bold">
                  <span>{day}</span>
                  <span className="text-muted-foreground font-normal">
                    {dayOrders.length} ordini • {formatCurrency(revenue)}
                  </span>
                </h2>
                <ul className="flex flex-col gap-2">
                  {dayOrders.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/orders/${o.id}` as Route}
                        className="border-border bg-background hover:bg-accent block rounded-lg border p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            #{o.orderNumber} • {formatTime(o.createdAt)}
                          </span>
                          <span className="flex items-center gap-2">
                            {o.status === 'delivered' ? '✅' : '❌'}
                            <span className="font-semibold">{formatCurrency(o.totalCents)}</span>
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 truncate">
                          {o.items.map((i) => `${i.quantity}× ${i.name}`).join(' • ')}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })
        )}
      </div>
    </main>
  )
}
