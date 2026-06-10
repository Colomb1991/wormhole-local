'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { formatCurrency, formatTime } from '@wormhole/shared'
import { Button, Input } from '@wormhole/ui'
import {
  acceptOrderAction,
  rejectOrderAction,
  markReadyAction,
  markInDeliveryAction,
  markDeliveredAction,
  cancelOrderAction,
} from '@/app/actions'
import type { SerializedOrder } from '@/lib/serialize'

const REJECT_REASONS = ['Ingredienti finiti', 'Cucina chiusa', 'CAP non servito ora', 'Altro']

interface Props {
  order: SerializedOrder
  onChanged: () => Promise<void> | void
  /** Nasconde le azioni (es. nello storico). */
  readOnly?: boolean
}

export function OrderCard({ order, onChanged, readOnly = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]!)
  const [deliveryCode, setDeliveryCode] = useState('')

  const detailHref = `/orders/${order.id}` as Route

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (!res.success) {
        setError(res.error ?? 'Errore')
        return
      }
      setShowReject(false)
      setDeliveryCode('')
      await onChanged()
    })
  }

  return (
    <li className="border-border bg-background rounded-xl border p-4 shadow-sm">
      <Link href={detailHref} className="block">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold">
            #{order.orderNumber} • slot {formatTime(order.scheduledSlotIso)}
          </p>
          <p className="font-bold">{formatCurrency(order.totalCents)}</p>
        </div>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {order.deliveryAddress.street} • {order.deliveryPostalCode} • 💵 contanti
          {order.changeToGiveCents != null && order.changeToGiveCents > 0
            ? ` (resto ${formatCurrency(order.changeToGiveCents)})`
            : ''}
        </p>
        <p className="mt-1 text-sm">
          {order.items.map((i) => `${i.quantity}× ${i.name}`).join(' • ')}
        </p>
        {order.customerNotes ? (
          <p className="text-muted-foreground mt-1 text-xs">📝 {order.customerNotes}</p>
        ) : null}
        {order.status === 'cancelled' && order.rejectionReason ? (
          <p className="text-destructive mt-1 text-xs">Motivo: {order.rejectionReason}</p>
        ) : null}
      </Link>

      {!readOnly ? (
        <div className="mt-3 flex flex-col gap-2">
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          {order.status === 'pending' ? (
            !showReject ? (
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={isPending}
                  onClick={() => run(() => acceptOrderAction(order.id))}
                >
                  ACCETTA
                </Button>
                <Button
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => setShowReject(true)}
                >
                  RIFIUTA
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                >
                  {REJECT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowReject(false)}>
                    Annulla
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    disabled={isPending}
                    onClick={() => run(() => rejectOrderAction(order.id, rejectReason))}
                  >
                    Conferma rifiuto
                  </Button>
                </div>
              </div>
            )
          ) : null}

          {order.status === 'accepted' || order.status === 'preparing' ? (
            <Button disabled={isPending} onClick={() => run(() => markReadyAction(order.id))}>
              MARCA PRONTO
            </Button>
          ) : null}

          {order.status === 'ready' ? (
            <Button disabled={isPending} onClick={() => run(() => markInDeliveryAction(order.id))}>
              🚴 RIDER USCITO
            </Button>
          ) : null}

          {order.status === 'in_delivery' ? (
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                maxLength={5}
                placeholder="Codice cliente"
                value={deliveryCode}
                onChange={(e) => setDeliveryCode(e.target.value)}
                className="h-10 w-36"
              />
              <Button
                className="flex-1"
                disabled={isPending || deliveryCode.trim().length < 4}
                onClick={() => run(() => markDeliveredAction(order.id, deliveryCode))}
              >
                ✅ CONSEGNATO
              </Button>
            </div>
          ) : null}

          {['accepted', 'preparing', 'ready'].includes(order.status) ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (window.confirm(`Annullare l'ordine #${order.orderNumber}?`)) {
                  run(() => cancelOrderAction(order.id, 'Annullato dal ristorante'))
                }
              }}
              className="text-muted-foreground self-start text-xs underline"
            >
              Annulla ordine
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
