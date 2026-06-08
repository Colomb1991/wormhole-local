import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

/**
 * Address salvato in JSONB nei customer e order.
 */
export interface Address {
  street: string
  postalCode: string
  city: string
  buildingNumber: string | null
  floor: string | null
  notes: string | null
}

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Identità (telefono normalizzato in E.164)
    phone: varchar('phone', { length: 20 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),

    // Codice di consegna 4 cifre, univoco per tenant, fisso per sempre
    deliveryCode: varchar('delivery_code', { length: 5 }).notNull(),

    // Indirizzo di default salvato (opzionale)
    defaultAddress: jsonb('default_address').$type<Address>(),

    // GDPR
    hasConsentedDataStorage: boolean('has_consented_data_storage').notNull().default(false),
    consentGivenAt: timestamp('consent_given_at', { withTimezone: true }),

    // Statistiche (denormalizzate)
    totalOrders: integer('total_orders').notNull().default(0),
    totalSpentCents: integer('total_spent_cents').notNull().default(0),

    // Timestamps
    firstOrderAt: timestamp('first_order_at', { withTimezone: true }),
    lastOrderAt: timestamp('last_order_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    // Uno stesso telefono può essere customer diverso in tenant diversi.
    uniquePhonePerTenant: unique('customers_tenant_phone_unique').on(table.tenantId, table.phone),
    // Il delivery code deve essere univoco per tenant.
    uniqueCodePerTenant: unique('customers_tenant_code_unique').on(
      table.tenantId,
      table.deliveryCode
    ),
  })
)

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert

/**
 * Sessioni cliente: token in cookie HttpOnly, lookup per validare l'identità
 * tra page navigations senza richiedere login formale.
 */
export const customerSessions = pgTable('customer_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 128 }).unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
})

export type CustomerSession = typeof customerSessions.$inferSelect
export type NewCustomerSession = typeof customerSessions.$inferInsert
