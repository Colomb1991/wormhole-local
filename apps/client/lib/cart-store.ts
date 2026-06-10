'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@wormhole/core'

export type CartLineInput = Omit<CartItem, 'quantity'>

interface CartState {
  /** Slug del tenant a cui appartiene il carrello corrente. */
  tenantSlug: string | null
  items: CartItem[]

  /**
   * Garantisce che il carrello appartenga al tenant indicato. Se l'utente passa
   * a un altro ristorante, il carrello viene svuotato (carrelli non condivisi
   * tra tenant).
   */
  ensureTenant: (slug: string) => void
  addItem: (item: CartLineInput, quantity?: number) => void
  removeItem: (menuItemId: string) => void
  setQuantity: (menuItemId: string, quantity: number) => void
  increment: (menuItemId: string) => void
  decrement: (menuItemId: string) => void
  clear: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tenantSlug: null,
      items: [],

      ensureTenant: (slug) => {
        if (get().tenantSlug !== slug) {
          set({ tenantSlug: slug, items: [] })
        }
      },

      addItem: (item, quantity = 1) => {
        const items = get().items.slice()
        const idx = items.findIndex((i) => i.menuItemId === item.menuItemId)
        if (idx >= 0) {
          const existing = items[idx]!
          items[idx] = { ...existing, quantity: existing.quantity + quantity }
        } else {
          items.push({ ...item, quantity })
        }
        set({ items })
      },

      removeItem: (menuItemId) => {
        set({ items: get().items.filter((i) => i.menuItemId !== menuItemId) })
      },

      setQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.menuItemId !== menuItemId) })
          return
        }
        set({
          items: get().items.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i)),
        })
      },

      increment: (menuItemId) => {
        set({
          items: get().items.map((i) =>
            i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i
          ),
        })
      },

      decrement: (menuItemId) => {
        const item = get().items.find((i) => i.menuItemId === menuItemId)
        if (!item) return
        if (item.quantity <= 1) {
          set({ items: get().items.filter((i) => i.menuItemId !== menuItemId) })
          return
        }
        set({
          items: get().items.map((i) =>
            i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i
          ),
        })
      },

      clear: () => set({ items: [] }),
    }),
    {
      name: 'wh_cart',
      version: 1,
    }
  )
)
