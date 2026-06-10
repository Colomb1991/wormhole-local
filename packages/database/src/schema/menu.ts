import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type MenuCategory = typeof menuCategories.$inferSelect
export type NewMenuCategory = typeof menuCategories.$inferInsert

export const menuItems = pgTable(
  'menu_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => menuCategories.id, { onDelete: 'set null' }),

    // Identificazione
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),

    // Numero di menu cartaceo (es. "44", "44a"). I clienti dei ristoranti
    // cinesi ordinano spesso per numero e aiuta la comanda in cucina.
    // Nullable: piatti aggiunti dal pannello possono non avere un numero.
    menuNumber: varchar('menu_number', { length: 10 }),

    // Economia (sempre in centesimi — vedi ADR-003)
    priceCents: integer('price_cents').notNull(),
    vatRate: integer('vat_rate').notNull().default(10),

    // Operatività
    prepTimeMinutes: integer('prep_time_minutes').notNull().default(10),
    isAvailable: boolean('is_available').notNull().default(true),
    imageUrl: text('image_url'),

    // Timestamps (soft delete)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    // Il numero di menu è univoco per tenant (i NULL restano distinti in
    // Postgres, quindi non vincola i piatti senza numero). Abilita un seed
    // idempotente per chiave (tenantId, menuNumber).
    uniqueMenuNumberPerTenant: unique('menu_items_tenant_number_unique').on(
      table.tenantId,
      table.menuNumber
    ),
  })
)

export type MenuItem = typeof menuItems.$inferSelect
export type NewMenuItem = typeof menuItems.$inferInsert
