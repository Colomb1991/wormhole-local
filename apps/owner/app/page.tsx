import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db, tenantPauseState } from '@wormhole/database'
import { getOwnerSession } from '@/lib/auth'
import { getBoardOrders, sweepStaleOrders } from '@/lib/orders'
import { serializeOrder } from '@/lib/serialize'
import { OrdersBoard } from '@/components/OrdersBoard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getOwnerSession()
  if (!session) redirect('/login')

  await sweepStaleOrders(session.tenant.id, session.tenant.config.pendingOrderTimeoutMinutes)

  const [rows, pauseRow] = await Promise.all([
    getBoardOrders(session.tenant.id),
    db.query.tenantPauseState.findFirst({
      where: eq(tenantPauseState.tenantId, session.tenant.id),
      columns: { isPaused: true },
    }),
  ])

  return (
    <OrdersBoard
      tenantName={session.tenant.name}
      initialOrders={rows.map(serializeOrder)}
      initialPaused={pauseRow?.isPaused ?? false}
    />
  )
}
