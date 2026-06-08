import { pgTable, uuid, varchar, boolean, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

/**
 * Utenti autenticati (titolari e admin). NON contiene i clienti finali
 * — quelli sono in `customers`. Si appoggia a Supabase Auth: l'`id` qui
 * è uguale a `auth.users.id`. La sincronizzazione viene fatta via trigger
 * sulle creazioni in Supabase Auth (vedi migration).
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  fullName: varchar('full_name', { length: 255 }),
  role: varchar('role', { length: 20 }).notNull().default('owner'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

/**
 * Associazione many-to-many tra users e tenants. Un utente owner può gestire
 * più ristoranti in futuro (per ora 1:1).
 */
export const tenantUsers = pgTable(
  'tenant_users',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('owner'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.tenantId, table.userId] }),
  })
)

export type TenantUser = typeof tenantUsers.$inferSelect
export type NewTenantUser = typeof tenantUsers.$inferInsert
