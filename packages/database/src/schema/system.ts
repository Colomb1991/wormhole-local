import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'
import { customers } from './customers'

/**
 * Audit log delle azioni sensibili. Retention 1 anno (archiviazione poi).
 */
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  resourceId: varchar('resource_id', { length: 100 }).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type AuditLogEntry = typeof auditLog.$inferSelect
export type NewAuditLogEntry = typeof auditLog.$inferInsert

/**
 * Log delle notifiche inviate (push, email). Per debug e prevenzione duplicati.
 */
export const notificationLog = pgTable('notification_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  channel: varchar('channel', { length: 20 }).notNull(), // 'push' | 'email' | 'sms'
  recipientType: varchar('recipient_type', { length: 20 }).notNull(), // 'customer' | 'owner'
  recipientId: uuid('recipient_id').notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().default({}),
  status: varchar('status', { length: 20 }).notNull().default('sent'),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
})

export type NotificationLogEntry = typeof notificationLog.$inferSelect
export type NewNotificationLogEntry = typeof notificationLog.$inferInsert

/**
 * Web Push subscriptions: una per dispositivo. Possono essere associate a
 * un customer (cliente) o a un user (titolare).
 */
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').unique().notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: varchar('user_agent', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
})

export type PushSubscription = typeof pushSubscriptions.$inferSelect
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert

/**
 * Configurazione stampante termica per tenant. Salviamo l'ID del dispositivo
 * Bluetooth e i UUID dei servizi/caratteristiche per riconnessioni veloci.
 */
export const printerConfigs = pgTable('printer_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  deviceId: varchar('device_id', { length: 255 }),
  serviceUuid: varchar('service_uuid', { length: 100 }),
  characteristicUuid: varchar('characteristic_uuid', { length: 100 }),
  paperWidthMm: varchar('paper_width_mm', { length: 10 }).default('80'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type PrinterConfig = typeof printerConfigs.$inferSelect
export type NewPrinterConfig = typeof printerConfigs.$inferInsert
