import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const tenantPostalCodes = pgTable(
  'tenant_postal_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    postalCode: varchar('postal_code', { length: 10 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    isServed: boolean('is_served').notNull().default(true),
    deliveryFeeCents: integer('delivery_fee_cents').notNull(),
    zone: varchar('zone', { length: 10 }).notNull().default('medium'),
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),
    distanceFromRestaurantKm: decimal('distance_from_restaurant_km', { precision: 8, scale: 3 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueCapPerTenant: unique('tenant_postal_codes_tenant_cap_unique').on(
      table.tenantId,
      table.postalCode
    ),
  })
)

export type TenantPostalCode = typeof tenantPostalCodes.$inferSelect
export type NewTenantPostalCode = typeof tenantPostalCodes.$inferInsert

/**
 * Matrice pre-calcolata di distanze in linea d'aria tra coppie di CAP serviti.
 * Aggiornata via script `scripts/distances-matrix.ts`. Usata dall'algoritmo
 * di slot per calcolare compatibilità CAP nel medesimo slot.
 *
 * Convenzione: capA < capB (ordine lessicografico) per evitare duplicati.
 */
export const capDistanceMatrix = pgTable(
  'cap_distance_matrix',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    capA: varchar('cap_a', { length: 10 }).notNull(),
    capB: varchar('cap_b', { length: 10 }).notNull(),
    distanceKm: decimal('distance_km', { precision: 8, scale: 3 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniquePair: unique('cap_distance_matrix_pair_unique').on(
      table.tenantId,
      table.capA,
      table.capB
    ),
  })
)

export type CapDistance = typeof capDistanceMatrix.$inferSelect
export type NewCapDistance = typeof capDistanceMatrix.$inferInsert
