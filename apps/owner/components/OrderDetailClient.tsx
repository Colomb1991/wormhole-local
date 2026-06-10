'use client'

import { useRouter } from 'next/navigation'
import { OrderCard } from '@/components/OrderCard'
import type { SerializedOrder } from '@/lib/serialize'

/**
 * Wrapper client per la pagina dettaglio: riusa OrderCard (stesse azioni della
 * dashboard) e fa il refresh della pagina server dopo ogni transizione.
 */
export function OrderDetailClient({ order }: { order: SerializedOrder }) {
  const router = useRouter()
  return (
    <ul className="list-none">
      <OrderCard order={order} onChanged={() => router.refresh()} />
    </ul>
  )
}
