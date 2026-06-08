import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core'

/**
 * Configurazione operativa del tenant. Salvata come JSONB in `tenants.config`.
 * Modificabile dal pannello admin del titolare.
 */
export interface TenantConfig {
  // Slot di consegna
  slotDurationMinutes: 15 | 20 | 30
  deliveryWindowStart: string // "HH:MM" es. "19:00"
  deliveryWindowEnd: string // "HH:MM" es. "22:00"

  // Schedule settimanale
  weeklySchedule: {
    monday: DayConfig
    tuesday: DayConfig
    wednesday: DayConfig
    thursday: DayConfig
    friday: DayConfig
    saturday: DayConfig
    sunday: DayConfig
  }

  // Ordini
  minOrderAmountCents: number // 1000 = 10€
  maxCashChangeCents: number // 5000 = 50€

  // Tempi di preparazione
  defaultPrepTimeMinutes: number
  prepTimeBufferPerItem: number

  // Pagamenti
  paymentMethods: Array<'cash' | 'card'>

  // Notifiche
  notifyOwnerOnNewOrder: boolean
  notifyCustomerOnStatus: boolean

  // Timeout
  pendingOrderTimeoutMinutes: number // default 5
  customerCancellationWindowMinutes: number // default 2
}

export interface DayConfig {
  isOpen: boolean
  riderCount: number
  ordersPerSlot: number
}

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address').notNull(),
  postalCode: varchar('postal_code', { length: 10 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  country: varchar('country', { length: 2 }).notNull().default('IT'),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  logoUrl: text('logo_url'),
  brandColor: varchar('brand_color', { length: 7 }).default('#00A893'),
  tagline: text('tagline'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  config: jsonb('config')
    .$type<TenantConfig>()
    .notNull()
    .default({} as TenantConfig),
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),
  stripeOnboardingCompleted: boolean('stripe_onboarding_completed').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
