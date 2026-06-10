'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { useCartStore } from '@/lib/cart-store'
import {
  calculateSubtotal,
  calculatePrepTime,
  countItems,
  validateCart,
  type CartItem,
} from '@wormhole/core'
import { formatCurrency } from '@wormhole/shared'
import { Button } from '@wormhole/ui'

interface Props {
  tenantSlug: string
  minOrderAmountCents: number
  prepTimeBufferPerItem: number
  acceptingOrders: boolean
  closedMessage: string
}

export function CartView({
  tenantSlug,
  minOrderAmountCents,
  prepTimeBufferPerItem,
  acceptingOrders,
  closedMessage,
}: Props) {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const increment = useCartStore((s) => s.increment)
  const decrement = useCartStore((s) => s.decrement)

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const menuHref = `/r/${tenantSlug}/menu` as Route
  const checkoutHref = `/r/${tenantSlug}/checkout` as Route

  if (!mounted) {
    return <div className="text-muted-foreground p-8 text-center text-sm">Carico il carrello…</div>
  }

  if (countItems(items) === 0) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-5xl" aria-hidden>
          🛒
        </p>
        <p className="text-lg font-medium">Il carrello è vuoto</p>
        <Link
          href={menuHref}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-12 items-center rounded-md px-6 font-medium"
        >
          Vai al menu
        </Link>
      </div>
    )
  }

  const subtotal = calculateSubtotal(items)
  const prepTime = calculatePrepTime(items, { prepTimeBufferPerItem })
  const validation = validateCart(items, { minOrderAmountCents, prepTimeBufferPerItem })
  const canCheckout = validation.valid && acceptingOrders

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <ul className="border-border divide-border bg-background divide-y rounded-xl border">
        {items.map((item) => (
          <CartRow
            key={item.menuItemId}
            item={item}
            onIncrement={() => increment(item.menuItemId)}
            onDecrement={() => decrement(item.menuItemId)}
          />
        ))}
      </ul>

      <div className="border-border bg-background flex flex-col gap-2 rounded-xl border p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotale</span>
          <span className="font-semibold">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tempo di preparazione stimato</span>
          <span>{prepTime} min</span>
        </div>
        <p className="text-muted-foreground text-xs">
          La tariffa di consegna viene calcolata al checkout in base al CAP.
        </p>
      </div>

      {!validation.valid && validation.error === 'BELOW_MIN_ORDER' ? (
        <p className="bg-yellow-100 text-yellow-900 rounded-lg px-4 py-3 text-sm">
          Mancano {formatCurrency(validation.missingCents ?? 0)} alla consegna minima di{' '}
          {formatCurrency(minOrderAmountCents)}.
        </p>
      ) : null}

      {!acceptingOrders ? (
        <p className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {closedMessage}
        </p>
      ) : null}

      <Button
        size="lg"
        disabled={!canCheckout}
        onClick={() => router.push(checkoutHref)}
        className="w-full"
      >
        Continua
      </Button>

      <Link href={menuHref} className="text-muted-foreground text-center text-sm underline">
        Aggiungi altri piatti
      </Link>
    </div>
  )
}

function CartRow({
  item,
  onIncrement,
  onDecrement,
}: {
  item: CartItem
  onIncrement: () => void
  onDecrement: () => void
}) {
  return (
    <li className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.name}</p>
        <p className="text-muted-foreground text-sm">
          {formatCurrency(item.unitPriceCents)} × {item.quantity} ={' '}
          <span className="text-foreground font-medium">
            {formatCurrency(item.unitPriceCents * item.quantity)}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onDecrement}
          aria-label={`Riduci ${item.name}`}
          className="border-input hover:bg-accent flex h-9 w-9 items-center justify-center rounded-full border text-lg"
        >
          −
        </button>
        <span className="w-5 text-center font-medium" aria-live="polite">
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          aria-label={`Aumenta ${item.name}`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-9 w-9 items-center justify-center rounded-full text-lg"
        >
          +
        </button>
      </div>
    </li>
  )
}
