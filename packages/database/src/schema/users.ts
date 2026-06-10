import { pgTable, uuid, varchar, boolean, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

/**
 * Utenti autenticati (titolari e admin). NON contiene i clienti finali
 * — quelli sono in `customers`.
 *
 * Auth v0 (sessione 2026-06-11): email + password verificata contro
 * `passwordHash` (scrypt, vedi `@wormhole/core` auth/password). L'aggancio a
 * Supabase Auth previsto in origine resta un upgrade futuro: per quegli utenti
 * `passwordHash` sarà null e l'`id` coinciderà con `auth.users.id`.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  fullName: varchar('full_name', { length: 255 }),
  role: varchar('role', { length: 20 }).notNull().default('owner'),
  // Hash scrypt "scrypt$N$r$p$saltB64$hashB64". Null per utenti Supabase Auth.
  passwordHash: varchar('password_hash', { length: 255 }),
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

/**
 * Sessioni degli utenti autenticati (titolari/admin): token in cookie
 * HttpOnly, speculare a `customer_sessions` dei clienti.
 */
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Tenant "attivo" della sessione (per ora l'unico associato all'utente).
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 128 }).unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
})

export type UserSession = typeof userSessions.$inferSelect
export type NewUserSession = typeof userSessions.$inferInsert
