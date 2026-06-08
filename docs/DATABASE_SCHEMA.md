# Database Schema — Wormhole Local

> **Modello dati completo, pronto per implementazione in Drizzle ORM.**
> Documento di riferimento per ogni operazione su database.

---

## Indice

1. [Principi e convenzioni](#1-principi-e-convenzioni)
2. [Tabelle anagrafica](#2-tabelle-anagrafica)
3. [Tabelle utenti e auth](#3-tabelle-utenti-e-auth)
4. [Tabelle menu](#4-tabelle-menu)
5. [Tabelle clienti](#5-tabelle-clienti)
6. [Tabelle ordini](#6-tabelle-ordini)
7. [Tabelle CAP e distanze](#7-tabelle-cap-e-distanze)
8. [Tabelle configurazioni e schedule](#8-tabelle-configurazioni-e-schedule)
9. [Tabelle feedback](#9-tabelle-feedback)
10. [Tabelle audit e sistema](#10-tabelle-audit-e-sistema)
11. [Indici e performance](#11-indici-e-performance)
12. [Row Level Security](#12-row-level-security)
13. [Seed data iniziale](#13-seed-data-iniziale)
14. [Strategia migrazioni](#14-strategia-migrazioni)

---

## 1. Principi e convenzioni

### 1.1 Tipi di dato standard

| Concetto         | Tipo PostgreSQL           | Note                               |
| ---------------- | ------------------------- | ---------------------------------- |
| Identificatori   | `uuid`                    | Sempre UUID v4, mai sequenziali    |
| Timestamp        | `timestamptz`             | UTC, conversione client-side       |
| Stringhe brevi   | `varchar(255)`            | Default                            |
| Stringhe lunghe  | `text`                    | Per descrizioni, note              |
| Importi monetari | `integer`                 | Sempre in centesimi                |
| Tempi (minuti)   | `integer`                 | Es. prep time                      |
| Coordinate       | `decimal(10, 7)`          | Lat/lng                            |
| Distanze (km)    | `decimal(8, 3)`           | Es. 12.345 km                      |
| JSON strutturato | `jsonb`                   | Indicizzabile, queryable           |
| Enum             | `text` + check constraint | Più flessibile di enum PostgreSQL  |
| Booleans         | `boolean`                 | Default `false` se non specificato |

### 1.2 Naming conventions

- **Tabelle**: `snake_case`, plurali (es. `menu_items`, `customers`, `orders`)
- **Colonne**: `snake_case`, descrittivi
- **Foreign keys**: `<tabella_singolare>_id` (es. `tenant_id`, `customer_id`)
- **Timestamps**: `created_at`, `updated_at`, `deleted_at`, `[action]_at`
- **Booleans**: prefisso `is_`, `has_`, `can_` (es. `is_active`, `has_consented`)
- **Indici**: `idx_<tabella>_<colonne>` (es. `idx_orders_tenant_status`)
- **Constraints**: `<tabella>_<colonna>_<tipo>` (es. `orders_status_check`)

### 1.3 Colonne comuni a tutte le tabelle

Ogni tabella ha:

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()` (aggiornato via trigger)

Tabelle multi-tenant aggiungono:

- `tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`

Tabelle soft-deletable aggiungono:

- `deleted_at timestamptz NULL` (NULL = attivo, valore = eliminato)

### 1.4 Soft delete

Per entità storicamente importanti (menu_items, customers, orders) usiamo **soft delete**:

- Riga non eliminata fisicamente
- Campo `deleted_at` settato al momento della "cancellazione"
- Query default escludono `WHERE deleted_at IS NULL`
- Permette di mantenere integrità referenziale degli ordini storici

Per dati operativi (sessioni, log temporanei) usiamo **hard delete** normale.

### 1.5 Trigger per updated_at

Funzione PostgreSQL applicata a tutte le tabelle:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applicato a ogni tabella
CREATE TRIGGER update_<tabella>_updated_at
  BEFORE UPDATE ON <tabella>
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 2. Tabelle anagrafica

### 2.1 `tenants` (ristoranti)

Tabella centrale del multi-tenancy. Ogni ristorante è un tenant.

```sql
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificazione
  slug varchar(100) UNIQUE NOT NULL,
  name varchar(255) NOT NULL,

  -- Localizzazione
  address text NOT NULL,
  postal_code varchar(10) NOT NULL,
  city varchar(100) NOT NULL,
  country varchar(2) NOT NULL DEFAULT 'IT',
  latitude decimal(10, 7),
  longitude decimal(10, 7),

  -- Contatti
  phone varchar(20) NOT NULL,
  email varchar(255) NOT NULL,

  -- Branding
  logo_url text,
  brand_color varchar(7) DEFAULT '#00A893',
  tagline text,

  -- Stato
  status varchar(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),

  -- Configurazione (JSON strutturato)
  config jsonb NOT NULL DEFAULT '{}',

  -- Stripe (predisposto, non attivo)
  stripe_account_id varchar(255),
  stripe_onboarding_completed boolean DEFAULT false,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
```

**Schema Drizzle**:

```typescript
// packages/database/src/schema/tenants.ts
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
  config: jsonb('config').$type<TenantConfig>().notNull().default({}),
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),
  stripeOnboardingCompleted: boolean('stripe_onboarding_completed').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
```

**Struttura `config` (TenantConfig)**:

```typescript
interface TenantConfig {
  // Slot
  slotDurationMinutes: 15 | 20 | 30
  deliveryWindowStart: string // "19:00"
  deliveryWindowEnd: string // "22:00"

  // Settimana
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

  // Tempi
  defaultPrepTimeMinutes: number // 10
  prepTimeBufferPerItem: number // 1

  // Pagamenti
  paymentMethods: ('cash' | 'card')[]

  // Notifiche
  notifyOwnerOnNewOrder: boolean
  notifyCustomerOnStatus: boolean

  // Timeout
  pendingOrderTimeoutMinutes: number // 5
  customerCancellationWindowMinutes: number // 2
}

interface DayConfig {
  isOpen: boolean
  riderCount: number
  ordersPerSlot: number
}
```

---

## 3. Tabelle utenti e auth

### 3.1 `users` (titolari e admin)

Tabella per autenticazione di titolari e admin. **NON contiene i clienti finali** (loro sono in `customers`).

Si appoggia a Supabase Auth: la tabella `auth.users` è gestita da Supabase, noi ne abbiamo una `public.users` che la estende.

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  email varchar(255) UNIQUE NOT NULL,
  full_name varchar(255),

  role varchar(20) NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'super_admin')),

  -- Status
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### 3.2 `tenant_users` (associazione utenti-tenant)

Un utente owner può gestire 1 o più tenant (in futuro). Per ora 1-1, ma struttura many-to-many.

```sql
CREATE TABLE tenant_users (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Permessi specifici per questo tenant
  permissions jsonb NOT NULL DEFAULT '[]',

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
```

---

## 4. Tabelle menu

### 4.1 `menu_categories` (categorie del menu)

```sql
CREATE TABLE menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name varchar(100) NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, name)
);

CREATE INDEX idx_menu_categories_tenant ON menu_categories(tenant_id, sort_order);
```

### 4.2 `menu_items` (piatti)

```sql
CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES menu_categories(id) ON DELETE SET NULL,

  -- Identificazione
  name varchar(255) NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,

  -- Economia
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  vat_rate integer NOT NULL DEFAULT 10 CHECK (vat_rate IN (4, 10, 22)),

  -- Operatività
  prep_time_minutes integer NOT NULL DEFAULT 10 CHECK (prep_time_minutes > 0),
  is_available boolean NOT NULL DEFAULT true,
  image_url text,

  -- Soft delete
  deleted_at timestamptz,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_items_tenant ON menu_items(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_items_category ON menu_items(category_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_items_available ON menu_items(tenant_id, is_available) WHERE deleted_at IS NULL;
```

**Schema Drizzle**:

```typescript
// packages/database/src/schema/menu.ts
import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const menuItems = pgTable('menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => menuCategories.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  priceCents: integer('price_cents').notNull(),
  vatRate: integer('vat_rate').notNull().default(10),
  prepTimeMinutes: integer('prep_time_minutes').notNull().default(10),
  isAvailable: boolean('is_available').notNull().default(true),
  imageUrl: text('image_url'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type MenuItem = typeof menuItems.$inferSelect
export type NewMenuItem = typeof menuItems.$inferInsert
```

---

## 5. Tabelle clienti

### 5.1 `customers` (clienti finali del ristorante)

I clienti che ordinano. **Non sono utenti auth Supabase**: identificati dal telefono, niente password.

```sql
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identificazione
  phone varchar(20) NOT NULL,                   -- formato E.164 normalizzato
  name varchar(255) NOT NULL,
  email varchar(255),

  -- Codice consegna univoco per tenant
  delivery_code varchar(10) NOT NULL,

  -- Indirizzo default (opzionale, salvato se cliente ha consentito)
  default_address jsonb,                         -- struttura Address

  -- Consenso GDPR
  has_consented_data_storage boolean NOT NULL DEFAULT false,
  consent_given_at timestamptz,

  -- Statistiche denormalizzate (aggiornate via trigger)
  total_orders integer NOT NULL DEFAULT 0,
  total_spent_cents integer NOT NULL DEFAULT 0,
  first_order_at timestamptz,
  last_order_at timestamptz,

  -- Soft delete
  deleted_at timestamptz,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Vincoli
  UNIQUE (tenant_id, phone),
  UNIQUE (tenant_id, delivery_code)
);

CREATE INDEX idx_customers_tenant_phone ON customers(tenant_id, phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_tenant_code ON customers(tenant_id, delivery_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_last_order ON customers(tenant_id, last_order_at DESC) WHERE deleted_at IS NULL;
```

**Struttura `default_address` (JSON)**:

```typescript
interface Address {
  street: string // "Via XX Settembre 15"
  postalCode: string // "57125"
  city: string // "Livorno"
  buildingNumber: string | null // "15A"
  floor: string | null // "Scala B, piano 3"
  notes: string | null // "citofono Bianchi"
}
```

### 5.2 `customer_sessions` (sessioni client web/app)

Per gestire l'identificazione cliente senza password.

```sql
CREATE TABLE customer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Token sessione (cookie HttpOnly)
  session_token varchar(255) UNIQUE NOT NULL,

  -- Metadati
  ip_address inet,
  user_agent text,

  -- Scadenza
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_sessions_token ON customer_sessions(session_token);
CREATE INDEX idx_customer_sessions_customer ON customer_sessions(customer_id);
CREATE INDEX idx_customer_sessions_expires ON customer_sessions(expires_at);
```

**Cleanup automatico**: job giornaliero elimina sessioni con `expires_at < now()`.

---

## 6. Tabelle ordini

### 6.1 `orders` (ordini)

Cuore del sistema. Ogni ordine è una riga, con snapshot completo dei dati.

```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,

  -- Identificazione human-readable
  order_number varchar(20) NOT NULL,            -- "#1547" sequenziale per tenant

  -- Contenuto (snapshot per integrità storica)
  items jsonb NOT NULL,                          -- array di OrderItem
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  delivery_fee_cents integer NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),

  -- Consegna
  delivery_address jsonb NOT NULL,               -- struttura Address
  delivery_postal_code varchar(10) NOT NULL,
  scheduled_slot timestamptz NOT NULL,           -- es. 2026-05-15 19:30:00 UTC
  delivery_code varchar(10) NOT NULL,            -- copia da customers per sicurezza

  -- Pagamento
  payment_method varchar(20) NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'card')),
  payment_status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),

  -- Per pagamento contanti
  customer_paying_with_cents integer,            -- 3000 = 30€
  change_to_give_cents integer,                  -- 250 = 2.50€

  -- Per pagamento online (futuro)
  stripe_payment_intent_id varchar(255),
  stripe_charge_id varchar(255),

  -- Stato
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'preparing', 'ready',
                       'in_delivery', 'delivered', 'cancelled')),
  rejection_reason text,
  status_history jsonb NOT NULL DEFAULT '[]',    -- array StatusChange

  -- Note
  customer_notes text,
  internal_notes text,                            -- visibili solo titolare

  -- Timestamps degli stati
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  in_delivery_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Vincoli
  UNIQUE (tenant_id, order_number)
);

CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
CREATE INDEX idx_orders_customer ON orders(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_orders_scheduled_slot ON orders(tenant_id, scheduled_slot) WHERE status IN ('accepted', 'preparing', 'ready', 'in_delivery');
CREATE INDEX idx_orders_pending ON orders(tenant_id, created_at) WHERE status = 'pending';
```

**Struttura `items` (array di OrderItem JSON)**:

```typescript
interface OrderItem {
  menuItemId: string // FK a menu_items.id (snapshot)
  name: string // snapshot nome al momento ordine
  unitPriceCents: number // snapshot prezzo
  prepTimeMinutes: number // snapshot tempo prep
  quantity: number
  totalCents: number // unitPrice * quantity
  notes: string | null // libero, opzionale
}
```

**Struttura `status_history` (array di StatusChange JSON)**:

```typescript
interface StatusChange {
  status: OrderStatus
  at: string // ISO timestamp
  byUserId: string | null // null se cambio automatico
  reason: string | null
}
```

**Schema Drizzle**:

```typescript
// packages/database/src/schema/orders.ts
import { pgTable, uuid, varchar, integer, jsonb, text, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { customers } from './customers'

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),

  orderNumber: varchar('order_number', { length: 20 }).notNull(),

  items: jsonb('items').$type<OrderItem[]>().notNull(),
  subtotalCents: integer('subtotal_cents').notNull(),
  deliveryFeeCents: integer('delivery_fee_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull(),

  deliveryAddress: jsonb('delivery_address').$type<Address>().notNull(),
  deliveryPostalCode: varchar('delivery_postal_code', { length: 10 }).notNull(),
  scheduledSlot: timestamp('scheduled_slot', { withTimezone: true }).notNull(),
  deliveryCode: varchar('delivery_code', { length: 10 }).notNull(),

  paymentMethod: varchar('payment_method', { length: 20 }).notNull().default('cash'),
  paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('pending'),
  customerPayingWithCents: integer('customer_paying_with_cents'),
  changeToGiveCents: integer('change_to_give_cents'),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeChargeId: varchar('stripe_charge_id', { length: 255 }),

  status: varchar('status', { length: 20 }).notNull().default('pending'),
  rejectionReason: text('rejection_reason'),
  statusHistory: jsonb('status_history').$type<StatusChange[]>().notNull().default([]),

  customerNotes: text('customer_notes'),
  internalNotes: text('internal_notes'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  preparingAt: timestamp('preparing_at', { withTimezone: true }),
  readyAt: timestamp('ready_at', { withTimezone: true }),
  inDeliveryAt: timestamp('in_delivery_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
```

### 6.2 `order_sequences` (sequenze numero ordine per tenant)

Per generare numeri ordine sequenziali per tenant (es. ristorante A ha #1, #2, #3; ristorante B ha la sua sequenza #1, #2, #3).

```sql
CREATE TABLE order_sequences (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  current_number integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Funzione per ottenere prossimo numero (atomica)**:

```sql
CREATE OR REPLACE FUNCTION get_next_order_number(p_tenant_id uuid)
RETURNS integer AS $$
DECLARE
  next_num integer;
BEGIN
  INSERT INTO order_sequences (tenant_id, current_number)
  VALUES (p_tenant_id, 1)
  ON CONFLICT (tenant_id) DO UPDATE
  SET current_number = order_sequences.current_number + 1,
      updated_at = now()
  RETURNING current_number INTO next_num;

  RETURN next_num;
END;
$$ LANGUAGE plpgsql;
```

---

## 7. Tabelle CAP e distanze

### 7.1 `tenant_postal_codes` (CAP serviti da un tenant)

```sql
CREATE TABLE tenant_postal_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  postal_code varchar(10) NOT NULL,
  city varchar(100) NOT NULL,

  is_served boolean NOT NULL DEFAULT true,
  delivery_fee_cents integer NOT NULL CHECK (delivery_fee_cents >= 0),

  zone varchar(20) CHECK (zone IN ('near', 'medium', 'far')),

  -- Coordinate centrali (per calcolo distanze)
  latitude decimal(10, 7),
  longitude decimal(10, 7),

  -- Distanza in km dal ristorante (haversine)
  distance_from_restaurant_km decimal(8, 3),

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, postal_code)
);

CREATE INDEX idx_tenant_postal_codes_tenant ON tenant_postal_codes(tenant_id) WHERE is_served = true;
CREATE INDEX idx_tenant_postal_codes_zone ON tenant_postal_codes(tenant_id, zone) WHERE is_served = true;
```

### 7.2 `cap_distance_matrix` (matrice distanze tra coppie CAP)

Pre-calcolata una volta, usata per logica intelligente slot.

```sql
CREATE TABLE cap_distance_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  cap_a varchar(10) NOT NULL,
  cap_b varchar(10) NOT NULL,
  distance_km decimal(8, 3) NOT NULL,

  -- Tempo stimato in scooter urbano (minuti)
  estimated_travel_time_minutes integer NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  -- Vincoli (cap_a < cap_b per evitare duplicati)
  CHECK (cap_a < cap_b),
  UNIQUE (tenant_id, cap_a, cap_b)
);

CREATE INDEX idx_cap_distance_tenant_a ON cap_distance_matrix(tenant_id, cap_a);
CREATE INDEX idx_cap_distance_tenant_b ON cap_distance_matrix(tenant_id, cap_b);
```

**Funzione helper per ottenere distanza tra due CAP (ordine indifferente)**:

```sql
CREATE OR REPLACE FUNCTION get_cap_distance(
  p_tenant_id uuid,
  p_cap_a varchar(10),
  p_cap_b varchar(10)
) RETURNS decimal AS $$
DECLARE
  result decimal;
BEGIN
  IF p_cap_a = p_cap_b THEN
    RETURN 0;
  END IF;

  SELECT distance_km INTO result
  FROM cap_distance_matrix
  WHERE tenant_id = p_tenant_id
    AND ((cap_a = LEAST(p_cap_a, p_cap_b) AND cap_b = GREATEST(p_cap_a, p_cap_b)));

  RETURN COALESCE(result, NULL);
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 8. Tabelle configurazioni e schedule

### 8.1 `tenant_schedule_exceptions` (chiusure straordinarie e festività)

```sql
CREATE TABLE tenant_schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Data dell'eccezione
  date date NOT NULL,

  -- Tipo
  type varchar(20) NOT NULL CHECK (type IN ('closed', 'open', 'modified')),

  -- Motivo (visibile come banner ai clienti)
  reason text,

  -- Se 'modified': configurazione custom per quel giorno
  custom_config jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, date)
);

CREATE INDEX idx_schedule_exceptions_tenant_date ON tenant_schedule_exceptions(tenant_id, date);
CREATE INDEX idx_schedule_exceptions_future ON tenant_schedule_exceptions(tenant_id, date) WHERE date >= CURRENT_DATE;
```

### 8.2 `tenant_pause_state` (pausa ordini temporanea)

Per il toggle "Stop Ordini" usato dalla titolare in emergenza.

```sql
CREATE TABLE tenant_pause_state (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,

  is_paused boolean NOT NULL DEFAULT false,
  paused_at timestamptz,
  paused_by_user_id uuid REFERENCES users(id),
  pause_reason text,

  -- Auto-resume opzionale
  auto_resume_at timestamptz,

  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 9. Tabelle feedback

### 9.1 `feedback` (feedback privato cliente)

```sql
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,

  -- Voto
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),

  -- Commento opzionale
  comment text,

  -- Sempre privato in v0
  is_internal boolean NOT NULL DEFAULT true,

  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Un feedback per ordine
  UNIQUE (order_id)
);

CREATE INDEX idx_feedback_tenant_created ON feedback(tenant_id, created_at DESC);
CREATE INDEX idx_feedback_tenant_rating ON feedback(tenant_id, rating);
```

---

## 10. Tabelle audit e sistema

### 10.1 `audit_log` (log azioni sensibili)

```sql
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Azione
  action varchar(100) NOT NULL,             -- 'accept_order', 'change_menu_price', etc.
  resource_type varchar(50) NOT NULL,        -- 'order', 'menu_item', etc.
  resource_id varchar(255),                  -- ID della risorsa coinvolta

  -- Metadati
  metadata jsonb DEFAULT '{}',               -- dati extra (vecchio/nuovo valore)
  ip_address inet,
  user_agent text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
```

**Retention**: 1 anno, poi archiviazione automatica (job batch).

### 10.2 `notification_log` (log notifiche inviate)

Per troubleshooting e analisi.

```sql
CREATE TABLE notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,

  -- Destinatario
  recipient_type varchar(20) NOT NULL CHECK (recipient_type IN ('customer', 'owner', 'admin')),
  recipient_id uuid,                          -- customer_id o user_id

  -- Tipo
  channel varchar(20) NOT NULL CHECK (channel IN ('push', 'email', 'sms')),
  notification_type varchar(50) NOT NULL,     -- 'order_accepted', 'new_order', etc.

  -- Contenuto
  subject varchar(255),
  body text,

  -- Stato
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  error_message text,

  -- Riferimenti
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,

  -- Timestamps
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_log_tenant_recipient ON notification_log(tenant_id, recipient_id);
CREATE INDEX idx_notification_log_order ON notification_log(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_notification_log_status ON notification_log(status) WHERE status IN ('pending', 'failed');
```

### 10.3 `push_subscriptions` (subscription Web Push per utenti)

```sql
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Per i clienti
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  -- Per i titolari/admin
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,

  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Subscription endpoint e chiavi
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,

  -- Metadati device
  device_type varchar(50),                    -- 'mobile-android', 'desktop', etc.
  device_name varchar(255),

  -- Stato
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Almeno uno tra customer_id e user_id deve essere settato
  CHECK ((customer_id IS NOT NULL) OR (user_id IS NOT NULL)),
  -- Endpoint univoco
  UNIQUE (endpoint)
);

CREATE INDEX idx_push_subscriptions_customer ON push_subscriptions(customer_id) WHERE is_active = true;
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id) WHERE is_active = true;
```

### 10.4 `printer_configs` (configurazioni stampanti)

Per ogni titolare/dispositivo, la stampante associata.

```sql
CREATE TABLE printer_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Identificazione device Bluetooth
  device_name varchar(255),
  device_id varchar(255),                     -- Bluetooth device ID
  service_uuid varchar(100),
  characteristic_uuid varchar(100),

  -- Configurazioni
  paper_width_mm integer DEFAULT 80,          -- 58 o 80mm
  encoding varchar(20) DEFAULT 'CP437',
  cut_paper boolean DEFAULT true,

  -- Stato
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, device_id)
);
```

---

## 11. Indici e performance

### 11.1 Indici critici (già definiti sopra, riassunto)

| Tabella               | Indice                       | Quando usato                 |
| --------------------- | ---------------------------- | ---------------------------- |
| `tenants`             | `idx_tenants_slug`           | Lookup per URL path          |
| `customers`           | `idx_customers_tenant_phone` | Login cliente                |
| `customers`           | `idx_customers_tenant_code`  | Verifica codice consegna     |
| `orders`              | `idx_orders_tenant_status`   | Dashboard titolare           |
| `orders`              | `idx_orders_pending`         | Job timeout ordini           |
| `orders`              | `idx_orders_scheduled_slot`  | Calcolo capacità slot        |
| `menu_items`          | `idx_menu_items_tenant`      | Caricamento menu             |
| `menu_items`          | `idx_menu_items_category`    | Raggruppamento per categoria |
| `cap_distance_matrix` | `idx_cap_distance_tenant_a`  | Lookup distanze              |

### 11.2 Indici composti per query frequenti

```sql
-- Query "ordini di oggi del tenant per status"
CREATE INDEX idx_orders_today ON orders(tenant_id, status, created_at)
WHERE created_at >= date_trunc('day', now())
  AND status NOT IN ('cancelled', 'delivered');

-- Query "ordini in slot specifico"
CREATE INDEX idx_orders_slot_active ON orders(tenant_id, scheduled_slot)
WHERE status IN ('accepted', 'preparing', 'ready', 'in_delivery');

-- Query "feedback recenti del tenant"
CREATE INDEX idx_feedback_recent ON feedback(tenant_id, created_at DESC)
WHERE created_at >= now() - interval '30 days';
```

### 11.3 Partial indexes per soft-delete

```sql
-- Sempre filtriamo deleted_at IS NULL nei menu attivi
CREATE INDEX idx_menu_items_active ON menu_items(tenant_id, is_available)
WHERE deleted_at IS NULL AND is_available = true;

-- Stessa cosa per customers
CREATE INDEX idx_customers_active ON customers(tenant_id, phone)
WHERE deleted_at IS NULL;
```

### 11.4 Vacuum e analyze

Supabase fa autovacuum automaticamente. Configurazione di default va bene per i volumi previsti.

Per tabelle ad alta scrittura (`orders`, `audit_log`):

```sql
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);
```

---

## 12. Row Level Security

Su Supabase abilitiamo RLS per ogni tabella sensibile. Garantisce isolamento multi-tenant a livello DB.

### 12.1 Setup base

```sql
-- Abilita RLS su tutte le tabelle tenant-scoped
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_postal_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_distance_matrix ENABLE ROW LEVEL SECURITY;
```

### 12.2 Funzione helper per ottenere tenant corrente

```sql
CREATE OR REPLACE FUNCTION current_user_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id
  FROM tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### 12.3 Policy per `menu_items`

```sql
-- Lettura pubblica: chiunque (anche non autenticato) vede menu del tenant
-- (per app cliente che non richiede login)
CREATE POLICY "Public menu read"
  ON menu_items FOR SELECT
  USING (
    is_available = true
    AND deleted_at IS NULL
  );

-- Owner: vede tutti i suoi menu (anche non disponibili e deleted)
CREATE POLICY "Owner full menu access"
  ON menu_items FOR ALL
  USING (
    tenant_id = current_user_tenant_id()
  )
  WITH CHECK (
    tenant_id = current_user_tenant_id()
  );

-- Super admin: vede tutto
CREATE POLICY "Super admin full access"
  ON menu_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
```

### 12.4 Policy per `orders`

```sql
-- Customer: vede solo i suoi ordini (verifica via session token)
-- Implementato lato applicazione, RLS verifica tenant_id

-- Owner: vede ordini del suo tenant
CREATE POLICY "Owner sees own tenant orders"
  ON orders FOR SELECT
  USING (
    tenant_id = current_user_tenant_id()
  );

CREATE POLICY "Owner modifies own tenant orders"
  ON orders FOR UPDATE
  USING (
    tenant_id = current_user_tenant_id()
  )
  WITH CHECK (
    tenant_id = current_user_tenant_id()
  );

-- Nessuno può eliminare ordini (storico immutabile)
-- Solo soft cancellation via update status='cancelled'
CREATE POLICY "No order deletion"
  ON orders FOR DELETE
  USING (false);

-- Super admin: accesso totale per supporto
CREATE POLICY "Super admin orders"
  ON orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
```

### 12.5 Policy per `customers`

```sql
-- Owner: vede customer del suo tenant
CREATE POLICY "Owner sees own tenant customers"
  ON customers FOR ALL
  USING (
    tenant_id = current_user_tenant_id()
  );

-- Customer non ha JWT auth con Supabase: lookup tramite session token gestito
-- a livello applicazione, RLS verifica tenant_id via service role per query
-- pubbliche (rare, principalmente register/login customer flow)
```

### 12.6 Policy per `feedback`

```sql
-- Feedback è sempre interno (visibile solo titolare e admin)
CREATE POLICY "Owner sees own tenant feedback"
  ON feedback FOR ALL
  USING (
    tenant_id = current_user_tenant_id()
  );

-- Customer può creare feedback per propri ordini (verifica via session)
CREATE POLICY "Customer creates feedback for own orders"
  ON feedback FOR INSERT
  WITH CHECK (
    customer_id IN (
      -- Lookup via session, gestito da applicazione
      SELECT customer_id FROM customer_sessions
      WHERE session_token = current_setting('app.session_token', true)
    )
  );
```

### 12.7 Bypass RLS per operazioni di sistema

Per job batch, migrazioni, operazioni admin, useremo la **service role key** di Supabase che bypassa RLS.

**MAI esporre la service role key al client.**

---

## 13. Seed data iniziale

Script `packages/database/src/seed.ts` esegue dopo migrations:

### 13.1 Tenant pilota

```typescript
const restaurant = await db
  .insert(tenants)
  .values({
    slug: 'cinese-usdt',
    name: 'Ristorante Cinese USDT', // nome placeholder, da chiedere alla titolare
    address: 'Corso Mazzini 341',
    postalCode: '57126',
    city: 'Livorno',
    country: 'IT',
    latitude: '43.547234', // coordinate placeholder, da geocodare
    longitude: '10.310456',
    phone: '+390586000000', // placeholder
    email: 'titolare@cinese-usdt.it', // placeholder
    brandColor: '#D4242D',
    status: 'active',
    config: {
      slotDurationMinutes: 30,
      deliveryWindowStart: '19:00',
      deliveryWindowEnd: '22:00',
      weeklySchedule: {
        monday: { isOpen: true, riderCount: 1, ordersPerSlot: 3 },
        tuesday: { isOpen: false, riderCount: 0, ordersPerSlot: 0 },
        wednesday: { isOpen: true, riderCount: 1, ordersPerSlot: 3 },
        thursday: { isOpen: true, riderCount: 1, ordersPerSlot: 3 },
        friday: { isOpen: true, riderCount: 2, ordersPerSlot: 5 },
        saturday: { isOpen: true, riderCount: 2, ordersPerSlot: 5 },
        sunday: { isOpen: true, riderCount: 2, ordersPerSlot: 5 },
      },
      minOrderAmountCents: 1000, // 10€
      maxCashChangeCents: 5000, // 50€
      defaultPrepTimeMinutes: 10,
      prepTimeBufferPerItem: 1,
      paymentMethods: ['cash'], // v0: solo contanti
      notifyOwnerOnNewOrder: true,
      notifyCustomerOnStatus: true,
      pendingOrderTimeoutMinutes: 5,
      customerCancellationWindowMinutes: 2,
    },
  })
  .returning()
```

### 13.2 Categorie menu

```typescript
const categories = await db
  .insert(menuCategories)
  .values([
    { tenantId: restaurant.id, name: 'Antipasti', sortOrder: 1 },
    { tenantId: restaurant.id, name: 'Primi', sortOrder: 2 },
    { tenantId: restaurant.id, name: 'Secondi', sortOrder: 3 },
    { tenantId: restaurant.id, name: 'Sushi & Sashimi', sortOrder: 4 },
    { tenantId: restaurant.id, name: 'Riso & Spaghetti', sortOrder: 5 },
    { tenantId: restaurant.id, name: 'Bibite', sortOrder: 6 },
    { tenantId: restaurant.id, name: 'Dolci', sortOrder: 7 },
  ])
  .returning()
```

### 13.3 Piatti di esempio

```typescript
// Solo per test, da sostituire con menu reale fornito dalla titolare
await db.insert(menuItems).values([
  {
    tenantId: restaurant.id,
    categoryId: categories.find((c) => c.name === 'Primi').id,
    name: 'Spaghetti di soia con verdure',
    description: 'Spaghetti di soia saltati con verdure miste',
    priceCents: 550,
    vatRate: 10,
    prepTimeMinutes: 5,
    isAvailable: true,
    sortOrder: 1,
  },
  {
    tenantId: restaurant.id,
    categoryId: categories.find((c) => c.name === 'Antipasti').id,
    name: 'Ravioli alla piastra',
    description: 'Ravioli al maiale alla piastra (5 pz)',
    priceCents: 600,
    vatRate: 10,
    prepTimeMinutes: 15,
    isAvailable: true,
    sortOrder: 1,
  },
  // ... altri piatti
])
```

### 13.4 CAP serviti

```typescript
// CAP di Livorno serviti dal ristorante (placeholder, da confermare)
await db.insert(tenantPostalCodes).values([
  {
    tenantId: restaurant.id,
    postalCode: '57121',
    city: 'Livorno',
    isServed: true,
    deliveryFeeCents: 200, // 2.00€
    zone: 'near',
  },
  {
    tenantId: restaurant.id,
    postalCode: '57122',
    city: 'Livorno',
    isServed: true,
    deliveryFeeCents: 250,
    zone: 'medium',
  },
  {
    tenantId: restaurant.id,
    postalCode: '57125',
    city: 'Livorno',
    isServed: true,
    deliveryFeeCents: 200,
    zone: 'near',
  },
  {
    tenantId: restaurant.id,
    postalCode: '57126',
    city: 'Livorno',
    isServed: true,
    deliveryFeeCents: 200, // CAP base del ristorante
    zone: 'near',
  },
  {
    tenantId: restaurant.id,
    postalCode: '57127',
    city: 'Livorno',
    isServed: true,
    deliveryFeeCents: 300,
    zone: 'far',
  },
  {
    tenantId: restaurant.id,
    postalCode: '57128',
    city: 'Livorno',
    isServed: true,
    deliveryFeeCents: 350,
    zone: 'far',
  },
])

// Dopo questo, esegui lo script di calcolo matrice distanze:
// pnpm run build:distance-matrix
```

### 13.5 Customer di test

```typescript
// Solo in ambiente dev/staging, mai in produzione
if (process.env.NODE_ENV !== 'production') {
  await db.insert(customers).values([
    {
      tenantId: restaurant.id,
      phone: '+393331234567',
      name: 'Mario Rossi',
      email: 'mario@test.it',
      deliveryCode: '1234',
      defaultAddress: {
        street: 'Via Garibaldi 10',
        postalCode: '57125',
        city: 'Livorno',
        buildingNumber: '10',
        floor: 'Piano 2',
        notes: 'Citofono Rossi',
      },
      hasConsentedDataStorage: true,
      consentGivenAt: new Date(),
    },
  ])
}
```

---

## 14. Strategia migrazioni

### 14.1 Tool: Drizzle Kit

Gestiamo migrazioni con `drizzle-kit`:

```bash
# Genera nuova migrazione dalle modifiche allo schema
pnpm drizzle-kit generate:pg

# Applica migrazioni al DB
pnpm drizzle-kit push:pg
```

### 14.2 File migrazione

Ogni migrazione produce un file SQL in `packages/database/migrations/`:

```
packages/database/migrations/
├── 0000_initial_schema.sql
├── 0001_add_menu_categories.sql
├── 0002_add_feedback_table.sql
├── 0003_add_audit_log.sql
└── meta/
    └── _journal.json
```

### 14.3 Regole inderogabili

1. **Mai modificare migration già committate**. Sempre creare nuove migration.
2. **Mai eliminare colonne in produzione** senza un piano in 2 step (1: nullable, 2: rimuovi).
3. **Test migration prima del merge** su `dev` su DB di staging.
4. **Backup database prima di migration importanti** in produzione.
5. **Documentare ogni migration** con commento iniziale che spiega cosa fa e perché.

### 14.4 Esempio migrazione documentata

```sql
-- Migration: 0005_add_internal_notes_to_orders
-- Date: 2026-07-15
-- Author: Claude Code
-- Description: Aggiunge campo internal_notes per note interne titolare
--   non visibili al cliente. Richiesto da #issue-89.

ALTER TABLE orders ADD COLUMN internal_notes text;

CREATE INDEX idx_orders_internal_notes_search
  ON orders USING gin(to_tsvector('italian', internal_notes))
  WHERE internal_notes IS NOT NULL;

-- Rollback (in caso di problemi):
-- DROP INDEX idx_orders_internal_notes_search;
-- ALTER TABLE orders DROP COLUMN internal_notes;
```

### 14.5 Migration in produzione

Pipeline di deploy:

1. CI compila e testa la branch
2. CI esegue dry-run migration su DB di staging
3. Se OK, deploy su Vercel automatico
4. Hook pre-deploy applica migration su DB produzione
5. Se fallisce: rollback automatico Vercel, alert su Slack

### 14.6 Backup e disaster recovery

Supabase Pro fa backup giornalieri automatici (retention 7 giorni).

In aggiunta, script `scripts/backup-db.ts` esegue dump settimanale:

- Dump completo `.sql.gz`
- Salvato su Supabase Storage in bucket privato `backups/`
- Retention 12 settimane

In caso di disastro:

1. Restore da backup Supabase nativo (più recente)
2. Verifica integrità dati
3. Notifica utenti se ci sono perdite (rare ma possibili)

---

## 15. Riepilogo tabelle

Per riferimento rapido, ecco tutte le tabelle del sistema:

| Tabella                      | Scopo                         | Tenant-scoped    |
| ---------------------------- | ----------------------------- | ---------------- |
| `tenants`                    | Anagrafica ristoranti         | No (è il tenant) |
| `users`                      | Utenti auth (titolari, admin) | No               |
| `tenant_users`               | Associazione utenti-tenant    | Sì               |
| `menu_categories`            | Categorie del menu            | Sì               |
| `menu_items`                 | Piatti                        | Sì               |
| `customers`                  | Clienti finali                | Sì               |
| `customer_sessions`          | Sessioni clienti              | Sì               |
| `orders`                     | Ordini                        | Sì               |
| `order_sequences`            | Sequenza numeri ordine        | Sì               |
| `tenant_postal_codes`        | CAP serviti                   | Sì               |
| `cap_distance_matrix`        | Distanze pre-calcolate        | Sì               |
| `tenant_schedule_exceptions` | Chiusure/festività            | Sì               |
| `tenant_pause_state`         | Pausa ordini temporanea       | Sì               |
| `feedback`                   | Feedback privato              | Sì               |
| `audit_log`                  | Log azioni sensibili          | Sì               |
| `notification_log`           | Log notifiche                 | Sì               |
| `push_subscriptions`         | Subscription Web Push         | Sì               |
| `printer_configs`            | Configurazioni stampanti      | Sì               |

**Totale: 18 tabelle**, divise in:

- 1 tabella core multi-tenant (`tenants`)
- 2 tabelle auth (`users`, `tenant_users`)
- 2 tabelle menu (`menu_categories`, `menu_items`)
- 2 tabelle clienti (`customers`, `customer_sessions`)
- 2 tabelle ordini (`orders`, `order_sequences`)
- 2 tabelle geo (`tenant_postal_codes`, `cap_distance_matrix`)
- 2 tabelle configurazioni (`tenant_schedule_exceptions`, `tenant_pause_state`)
- 1 tabella feedback
- 4 tabelle sistema (`audit_log`, `notification_log`, `push_subscriptions`, `printer_configs`)

---

**Versione documento**: 1.0
**Data**: Maggio 2026
**Autore**: Stefano Colombini (CEO)
**Stato**: Approvato per inizio sviluppo
**Documenti correlati**: README.md, GITHUB_SETUP.md, MASTER_SPEC.md, FEATURE_SPECS.md
