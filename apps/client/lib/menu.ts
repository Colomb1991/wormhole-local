import { cache } from 'react'
import { and, asc, eq, isNull } from 'drizzle-orm'
import {
  db,
  menuCategories,
  menuItems,
  tenantPauseState,
  type MenuItem,
} from '@wormhole/database'

export interface MenuCategoryWithItems {
  id: string
  name: string
  sortOrder: number
  items: MenuItem[]
}

/**
 * Carica il menu completo del tenant raggruppato per categoria, ordinato.
 * Esclude i piatti soft-deleted. I piatti `isAvailable = false` SONO inclusi
 * (mostrati come "Esaurito", FEATURE_SPECS sez. 2.3).
 */
export const getMenuForTenant = cache(
  async (tenantId: string): Promise<MenuCategoryWithItems[]> => {
    const [categories, items] = await Promise.all([
      db.query.menuCategories.findMany({
        where: and(eq(menuCategories.tenantId, tenantId), eq(menuCategories.isActive, true)),
        orderBy: asc(menuCategories.sortOrder),
      }),
      db.query.menuItems.findMany({
        where: and(eq(menuItems.tenantId, tenantId), isNull(menuItems.deletedAt)),
        orderBy: asc(menuItems.sortOrder),
      }),
    ])

    const itemsByCategory = new Map<string, MenuItem[]>()
    for (const item of items) {
      if (!item.categoryId) continue
      const list = itemsByCategory.get(item.categoryId) ?? []
      list.push(item)
      itemsByCategory.set(item.categoryId, list)
    }

    return categories
      .map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
        items: itemsByCategory.get(c.id) ?? [],
      }))
      .filter((c) => c.items.length > 0)
  }
)

/**
 * Stato di pausa ordini del tenant. Se la riga non esiste, considera NON in pausa.
 */
export const getTenantPaused = cache(async (tenantId: string): Promise<boolean> => {
  const row = await db.query.tenantPauseState.findFirst({
    where: eq(tenantPauseState.tenantId, tenantId),
    columns: { isPaused: true },
  })
  return row?.isPaused ?? false
})
