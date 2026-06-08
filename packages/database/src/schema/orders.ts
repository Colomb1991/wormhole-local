import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  jsonb,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { customers, type Address } from './customers'

/**
 * Snapshot di un piatto al momento dell'ordine. Salvato come jsonb[]
 * dentro `orders.items` per mantenere prezzi/nomi storici anche se
 * il piatto cambia o viene eliminato.
 */
export interface OrderItem {
  menuItemId: string
  name: string
  unitPriceCents: number
  prepTimeMinutes: number
  quantity: number
  totalCents: number
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'in_delivery'
  | 'delivered'
  | 'cancelled'

export interface StatusChange {
  status: OrderStatus
  at: string // ISO timestamp
  byUserId: string | null
  reason: string | null
}

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),

    // Identificazione human-friendly, sequenziale per tenant (vedi order_sequences)
    orderNumber: integer('order_number').notNull(),

    // Contenuto (snapshot)
    items: jsonb('items').$type<OrderItem[]>().notNull(),
    subtotalCents: integer('subtotal_cents').notNull(),
    deliveryFeeCents: integer('delivery_fee_cents').notNull(),
    totalCents: integer('total_cents').notNull(),

    // Consegna
    deliveryAddress: jsonb('delivery_address').$type<Address>().notNull(),
    deliveryPostalCode: varchar('delivery_postal_code', { length: 10 }).notNull(),
    scheduledSlot: timestamp('scheduled_slot', { withTimezone: true }).notNull(),
    deliveryCode: varchar('delivery_code', { length: 5 }).notNull(),

    // Pagamento
    paymentMethod: varchar('payment_method', { length: 10 }).notNull().default('cash'),
    paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('pending'),

    // Pagamento contanti: campo opzionale per calcolare resto
    customerPayingWithCents: integer('customer_paying_with_cents'),
    changeToGiveCents: integer('change_to_give_cents'),

    // Pagamento online (futuro Stripe)
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
    stripeChargeId: varchar('stripe_charge_id', { length: 255 }),

    // Stato
    status: varchar('status', { length: 20 }).$type<OrderStatus>().notNull().default('pending'),
    rejectionReason: text('rejection_reason'),

    // Tracciabilità transizioni di stato
    statusHistory: jsonb('status_history').$type<StatusChange[]>().notNull().default([]),

    // Note libera del cliente
    customerNotes: text('customer_notes'),

    // Timestamps eventi di stato
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    readyAt: timestamp('ready_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueOrderNumberPerTenant: unique('orders_tenant_number_unique').on(
      table.tenantId,
      table.orderNumber
    ),
  })
)

export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert

/**
 * Sequenza per generare orderNumber consecutivi per tenant.
 * Usata in una transaction al momento della creazione dell'ordine.
 */
export const orderSequences = pgTable('order_sequences', {
  tenantId: uuid('tenant_id')
    .primaryKey()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  lastOrderNumber: integer('last_order_number').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type OrderSequence = typeof orderSequences.$inferSelect
export type NewOrderSequence = typeof orderSequences.$inferInsert
