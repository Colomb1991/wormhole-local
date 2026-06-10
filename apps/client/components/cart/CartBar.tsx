'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useEffect, useState } from 'react'
import { useCartStore } from '@/lib/cart-store'
import { calculateSubtotal, countItems } from '@wormhole/core'
import { formatCurrency } from '@wormhole/shared'

/**
 * Barra carrello flottante in fondo alla pagina (FEATURE_SPECS sez. 3.4).
 * Visibile solo se il carrello contiene almeno un piatto.
 */
export function CartBar({ tenantSlug }: { tenantSlug: string }) {
  const items = useCartStore((s) => s.items)
  // Evita mismatch di hydration: lo store si idrata da localStorage sul client.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null
  const count = countItems(items)
  if (count === 0) return null

  const subtotal = calculateSubtotal(items)
  const href = `/r/${tenantSlug}/cart` as Route

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-4">
      <Link
        href={href}
        className="bg-primary text-primary-foreground hover:bg-primary/90 pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-4 rounded-full px-6 py-4 font-semibold shadow-lg transition-colors"
      >
        <span>
          🛒 {count} {count === 1 ? 'piatto' : 'piatti'}
        </span>
        <span className="flex items-center gap-2">
          {formatCurrency(subtotal)}
          <span aria-hidden>→</span>
        </span>
      </Link>
    </div>
  )
}
