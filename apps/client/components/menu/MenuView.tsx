'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/lib/cart-store'
import { formatCurrency } from '@wormhole/shared'
import type { RestaurantStatus } from '@wormhole/core'
import { CartBar } from '@/components/cart/CartBar'

export interface MenuItemView {
  id: string
  name: string
  description: string | null
  priceCents: number
  prepTimeMinutes: number
  isAvailable: boolean
  menuNumber: string | null
}

export interface MenuCategoryView {
  id: string
  name: string
  items: MenuItemView[]
}

interface Props {
  tenantSlug: string
  tenantName: string
  categories: MenuCategoryView[]
  status: RestaurantStatus
}

const INDICATOR_EMOJI: Record<RestaurantStatus['indicator'], string> = {
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
}

const INDICATOR_CLASSES: Record<RestaurantStatus['indicator'], string> = {
  green: 'bg-primary/10 text-foreground',
  yellow: 'bg-yellow-100 text-yellow-900',
  red: 'bg-destructive/10 text-destructive',
}

export function MenuView({ tenantSlug, tenantName, categories, status }: Props) {
  const ensureTenant = useCartStore((s) => s.ensureTenant)
  useEffect(() => {
    ensureTenant(tenantSlug)
  }, [tenantSlug, ensureTenant])

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <header className="border-border bg-background sticky top-0 z-30 border-b">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <h1 className="text-xl font-bold">{tenantName}</h1>
          <div
            className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${INDICATOR_CLASSES[status.indicator]}`}
          >
            <span aria-hidden>{INDICATOR_EMOJI[status.indicator]}</span>
            <span>{status.message}</span>
          </div>
        </div>

        {/* Quick-nav categorie */}
        <nav className="mx-auto max-w-2xl overflow-x-auto px-4 pb-3">
          <ul className="flex gap-2 whitespace-nowrap">
            {categories.map((c) => (
              <li key={c.id}>
                <a
                  href={`#cat-${c.id}`}
                  className="bg-muted text-muted-foreground hover:bg-accent inline-block rounded-full px-3 py-1 text-sm"
                >
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-4">
        {categories.map((category) => (
          <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-32 py-4">
            <h2 className="mb-3 text-lg font-semibold">{category.name}</h2>
            <ul className="flex flex-col divide-y divide-[var(--color-border)]">
              {category.items.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </ul>
          </section>
        ))}
      </main>

      <CartBar tenantSlug={tenantSlug} />
    </div>
  )
}

function MenuItemCard({ item }: { item: MenuItemView }) {
  const addItem = useCartStore((s) => s.addItem)
  const quantity = useCartStore(
    (s) => s.items.find((i) => i.menuItemId === item.id)?.quantity ?? 0
  )

  function handleAdd() {
    addItem({
      menuItemId: item.id,
      name: item.name,
      unitPriceCents: item.priceCents,
      prepTimeMinutes: item.prepTimeMinutes,
    })
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(15)
    }
  }

  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {item.menuNumber ? (
            <span className="text-muted-foreground mr-1 font-mono text-sm">{item.menuNumber}.</span>
          ) : null}
          {item.name}
        </p>
        {item.description ? (
          <p className="text-muted-foreground mt-0.5 text-sm">{item.description}</p>
        ) : null}
        <p className="mt-1 text-sm font-semibold">{formatCurrency(item.priceCents)}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {item.isAvailable ? (
          <button
            type="button"
            onClick={handleAdd}
            aria-label={`Aggiungi ${item.name}`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 relative flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold transition-colors"
          >
            +
            {quantity > 0 ? (
              <span className="bg-foreground text-background absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs">
                {quantity}
              </span>
            ) : null}
          </button>
        ) : (
          <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-medium">
            Esaurito
          </span>
        )}
      </div>
    </li>
  )
}
