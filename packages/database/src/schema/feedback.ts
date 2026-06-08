import { pgTable, uuid, integer, text, boolean, timestamp, unique } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { customers } from './customers'
import { orders } from './orders'

/**
 * Feedback privato cliente → titolare. Una sola entry per ordine.
 * `isInternal = true` in v0: mai visibile pubblicamente.
 */
export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(), // 1..5
    comment: text('comment'),
    isInternal: boolean('is_internal').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueFeedbackPerOrder: unique('feedback_order_unique').on(table.orderId),
  })
)

export type Feedback = typeof feedback.$inferSelect
export type NewFeedback = typeof feedback.$inferInsert
