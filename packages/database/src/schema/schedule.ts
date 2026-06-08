import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  date,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import type { DayConfig } from './tenants'

/**
 * Eccezioni al normale schedule settimanale: festività, ferie, aperture
 * speciali. Override per data specifica.
 */
export const tenantScheduleExceptions = pgTable(
  'tenant_schedule_exceptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    type: varchar('type', { length: 20 }).notNull(), // 'closed' | 'open' | 'modified'
    reason: text('reason'),
    customConfig: jsonb('custom_config').$type<DayConfig>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueDatePerTenant: unique('tenant_schedule_exceptions_date_unique').on(
      table.tenantId,
      table.date
    ),
  })
)

export type ScheduleException = typeof tenantScheduleExceptions.$inferSelect
export type NewScheduleException = typeof tenantScheduleExceptions.$inferInsert

/**
 * Stato di pausa ordini temporanea. Singola riga per tenant.
 * Quando `isPaused = true`, l'app cliente mostra "Temporaneamente non accettiamo ordini".
 */
export const tenantPauseState = pgTable('tenant_pause_state', {
  tenantId: uuid('tenant_id')
    .primaryKey()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  isPaused: boolean('is_paused').notNull().default(false),
  reason: text('reason'),
  pausedAt: timestamp('paused_at', { withTimezone: true }),
  resumedAt: timestamp('resumed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type TenantPauseState = typeof tenantPauseState.$inferSelect
export type NewTenantPauseState = typeof tenantPauseState.$inferInsert
