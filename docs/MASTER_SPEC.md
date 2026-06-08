# Master Specification — Wormhole Local

> **Architettura, stack tecnico e decisioni di prodotto.**
> Documento di riferimento per ogni decisione tecnica importante.

---

## 1. Visione del prodotto

### 1.1 Cosa stiamo costruendo

Wormhole Local è una **Progressive Web App multi-tenant** per food delivery dedicata a ristoranti singoli. Al lancio serve un solo ristorante (asiatico-cinese a Livorno), ma l'architettura è progettata fin dal Day 1 per ospitare N ristoranti.

Non è un marketplace. Ogni ristorante ha la sua "vetrina" indipendente. Non c'è competizione tra ristoranti dentro l'app. Il cliente entra nell'app del ristorante specifico (es. tramite QR code, link, oppure scelta esplicita) e ordina da lì.

### 1.2 Tre interfacce, un backend

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   APP CLIENTE   │    │  APP TITOLARE   │    │ PANNELLO ADMIN  │
│      (PWA)      │    │      (PWA)      │    │      (Web)      │
│                 │    │                 │    │                 │
│ Naviga menu     │    │ Riceve ordini   │    │ Gestione menu   │
│ Carrello        │    │ Accetta/rifiuta │    │ Gestione CAP    │
│ Checkout        │    │ Marca pronto    │    │ Statistiche     │
│ Storico ordini  │    │ Stampa comanda  │    │ Config ristor.  │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                       ┌────────▼────────┐
                       │     BACKEND      │
                       │  (Next.js API)   │
                       │                  │
                       │ Server Actions   │
                       │ Database access  │
                       │ Auth             │
                       │ Notifications    │
                       └────────┬─────────┘
                                │
                       ┌────────▼────────┐
                       │   POSTGRESQL    │
                       │   (Supabase)    │
                       │                 │
                       │ Multi-tenant DB │
                       └─────────────────┘
```

### 1.3 Principi guida

1. **Semplicità prima di tutto** — soluzioni semplici batte soluzioni eleganti ma complesse
2. **Mobile first** — l'app vive sul cellulare di clienti e titolare
3. **Multi-tenant ready** — ogni query filtra per tenant, anche se al lancio c'è un solo tenant
4. **Build for change** — Stefano farà fix dopo, scrivi codice modificabile
5. **Costi zero in sviluppo** — solo piani gratuiti, mai upgrade automatici
6. **Documentazione viva** — ogni decisione tracciata su GitHub

---

## 2. Stack tecnologico (decisioni e motivazioni)

### 2.1 Framework: Next.js 15+ (App Router)

**Decisione**: Next.js con App Router.

**Motivazione**:

- Server Components riducono drasticamente il JS spedito al client
- Server Actions eliminano il bisogno di API routes separate per la maggior parte dei casi
- Eccellente integrazione con Vercel (deploy gratuito)
- Routing file-based intuitivo
- Ottimizzazione automatica immagini, fonts, scripts
- SEO ready (anche se per le PWA cliente non è critico)

**Alternative scartate**:

- Remix: ottimo ma ecosistema più piccolo
- Vite + React Router: più leggero ma serve più setup
- SvelteKit: ottimo ma Stefano deve poter contribuire a fix futuri, React è più comune

### 2.2 Linguaggio: TypeScript strict

**Decisione**: TypeScript con `strict: true`, mai `any`.

**Motivazione**:

- Type-safety previene il 60-80% dei bug runtime
- Autocomplete migliore = sviluppo più veloce
- Refactoring sicuro: cambiare un campo nel DB e vedere subito ovunque sia usato
- Documentazione implicita: i tipi sono la spec

**Regole**:

- `any` vietato (eccezione: integrazioni terze parti senza types)
- Tutti i parametri di funzione tipizzati
- Return types espliciti per funzioni esportate
- Usa `unknown` invece di `any` quando il tipo è davvero ignoto, poi narrow con type guards

### 2.3 Database: PostgreSQL via Supabase

**Decisione**: PostgreSQL ospitato su Supabase.

**Motivazione**:

- PostgreSQL è il database relazionale standard, robusto, scalabile
- Supabase free tier copre 500MB DB e 2GB bandwidth (sufficiente per anni)
- Auth integrata pronta all'uso
- Storage per immagini (foto piatti) gratis fino a 1GB
- Row Level Security nativo per multi-tenancy
- Realtime subscriptions se serviranno (per ora no)

**Alternative scartate**:

- MongoDB: NoSQL, meno adatto a dati relazionali strutturati come ordini
- MySQL: meno feature avanzate, gestione JSON inferiore
- SQLite: ottimo per dev, ma serve qualcosa di production-ready

### 2.4 ORM: Drizzle

**Decisione**: Drizzle ORM.

**Motivazione**:

- TypeScript-first, type-safety nativa
- Più leggero di Prisma (no generated client da MB)
- Migration management trasparente (SQL leggibile)
- Ottima integrazione con Supabase
- Query builder che assomiglia a SQL, facile da debuggare

**Alternative scartate**:

- Prisma: maturo ma generated client pesante, schema separato dal codice
- TypeORM: design discutibile, decoratori
- Raw SQL: troppo verboso, niente type-safety

### 2.5 Styling: Tailwind CSS 4

**Decisione**: Tailwind CSS 4+ con shadcn/ui per componenti.

**Motivazione**:

- Sviluppo UI veloce senza scrivere CSS custom
- Bundle size piccolo (purge automatico delle classi non usate)
- shadcn/ui = componenti accessibili pronti, personalizzabili
- Mobile-first per default
- Dark mode facile se servirà

**Convenzioni**:

- Componenti UI custom in `packages/ui`
- Mai stili inline (`style={{}}`) eccetto per valori dinamici computed
- Usa CSS variables per i colori del tenant (vedi sezione 4)

### 2.6 State management: Zustand + React Query

**Decisione**:

- **React Query / TanStack Query** per server state (dati che vengono dal DB)
- **Zustand** per client state globale (carrello, UI state, preferenze)
- **React Hook Form** per form state

**Motivazione**:

- React Query gestisce caching, refetching, optimistic updates automaticamente
- Zustand è minimale (3KB) e zero boilerplate vs Redux
- React Hook Form ha performance migliori vs Formik

### 2.7 Notifiche: Web Push API

**Decisione**: Web Push API nativa con service worker.

**Motivazione**:

- Funziona su Android e iOS (da iOS 16.4+)
- Gratis, no servizi terzi (Firebase Cloud Messaging escluso per ridurre dipendenze)
- Adatta a PWA installate sul home screen

**Limiti accettati**:

- iOS richiede installazione PWA per ricevere push (utenti dovranno aggiungere a home screen)
- Web Push richiede HTTPS (no problem, Vercel ce l'ha)

**Backup email**: per messaggi critici di conferma ordine, manda anche email via Resend (free tier 3000/mese).

### 2.8 Stampa termica: Web Bluetooth API

**Decisione**: comunicazione diretta browser → stampante via Web Bluetooth.

**Motivazione**:

- Nessun server intermedio
- Funziona su Chrome/Edge Android e desktop (l'app titolare gira sull'Android della cinese)
- Linguaggio ESC/POS standard supportato da tutte le stampanti termiche economiche

**Stampanti raccomandate**:

- Star Micronics TSP143IIIBI (Bluetooth, ~250€)
- Epson TM-m30 (Bluetooth, ~280€)

**Limitazioni**:

- iOS non supporta Web Bluetooth (limite Apple). Soluzione: l'app titolare gira su Android. Se la cinese ha iPhone, alternativa: usare stampante via rete LAN (Wi-Fi).

### 2.9 Riepilogo costi mensili a regime

Tutto su piani gratuiti durante sviluppo. Quando si lancia in produzione:

| Servizio                    | Piano | Costo            | Quando upgrade                  |
| --------------------------- | ----- | ---------------- | ------------------------------- |
| Vercel                      | Hobby | 0€               | Mai per ora                     |
| Vercel                      | Pro   | 20€/mese         | Solo se si supera bandwidth     |
| Supabase                    | Free  | 0€               | Quando si superano 500MB DB     |
| Supabase                    | Pro   | 25€/mese         | Probabilmente nei primi 12 mesi |
| Resend                      | Free  | 0€               | Sotto 3000 email/mese           |
| Nominatim                   | Free  | 0€               | Sempre gratis                   |
| **Totale durante sviluppo** |       | **0€**           |                                 |
| **Totale a regime**         |       | **~45-60€/mese** | Dopo lancio                     |

---

## 3. Architettura applicativa

### 3.1 Struttura monorepo

Usiamo **pnpm workspaces** per gestire un monorepo con 3 app e 4 package condivisi.

```
wormhole-local/
├── apps/
│   ├── client/                  # PWA cliente
│   │   ├── app/                 # Next.js App Router
│   │   │   ├── (auth)/          # Layout autenticazione
│   │   │   ├── (shop)/          # Layout shopping (menu, carrello)
│   │   │   ├── api/             # API routes (se servono)
│   │   │   └── layout.tsx
│   │   ├── components/          # Componenti specifici client app
│   │   └── package.json
│   │
│   ├── owner/                   # PWA titolare
│   │   ├── app/
│   │   │   ├── (dashboard)/     # Dashboard ordini
│   │   │   ├── settings/        # Configurazioni
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   └── package.json
│   │
│   └── admin/                   # Web app admin (Stefano)
│       ├── app/
│       │   ├── tenants/         # Gestione ristoranti
│       │   ├── system/          # Configurazioni sistema
│       │   └── layout.tsx
│       └── package.json
│
├── packages/
│   ├── database/                # Tutto ciò che riguarda il DB
│   │   ├── src/
│   │   │   ├── schema/          # Definizioni Drizzle (1 file per area)
│   │   │   ├── migrations/      # Migrazioni generate
│   │   │   ├── client.ts        # Client Drizzle configurato
│   │   │   └── seed.ts          # Dati iniziali per dev
│   │   └── package.json
│   │
│   ├── shared/                  # Codice condiviso da tutti
│   │   ├── src/
│   │   │   ├── types/           # Tipi TypeScript condivisi
│   │   │   ├── constants/       # Costanti (es. orari apertura)
│   │   │   ├── validations/     # Schema Zod
│   │   │   └── utils/           # Funzioni utility pure
│   │   └── package.json
│   │
│   ├── ui/                      # Componenti UI condivisi
│   │   ├── src/
│   │   │   ├── components/      # shadcn components personalizzati
│   │   │   └── styles/          # Stili condivisi
│   │   └── package.json
│   │
│   └── core/                    # Logica business
│       ├── src/
│       │   ├── slots/           # Calcolo slot orari
│       │   ├── cart/            # Logica carrello
│       │   ├── orders/          # Stato ordini
│       │   ├── delivery/        # Tariffe consegna, CAP
│       │   ├── customer-codes/  # Generazione codici univoci
│       │   ├── menu/            # Logica menu
│       │   └── notifications/   # Sistema notifiche
│       └── package.json
│
└── ...
```

### 3.2 Separazione delle responsabilità

**Apps** (`apps/*`):

- Contengono **solo** UI specifica di quella app + routing
- Importano logica da `packages/core`
- Importano dati da `packages/database`
- Importano tipi da `packages/shared`
- Importano componenti da `packages/ui`

**Packages** (`packages/*`):

- **`database`**: schema, query, migrazioni. Non sa nulla di UI.
- **`core`**: pura logica business. Non sa nulla di UI, ma può usare `database` e `shared`.
- **`shared`**: tipi, costanti, utility. Non importa nulla.
- **`ui`**: componenti React puri. Può importare da `shared` per i tipi.

**Regola di dipendenze**:

```
shared  ← (nessuno)
ui      ← shared
database ← shared
core    ← database, shared
apps    ← tutto
```

Una `package` non può MAI importare da `apps/`. Le `apps/` possono importare da qualsiasi `package`.

### 3.3 Convenzioni di naming

- **File componenti React**: `PascalCase.tsx` (es. `MenuItemCard.tsx`)
- **File utility/logica**: `kebab-case.ts` (es. `slot-calculator.ts`)
- **File test**: stesso nome del file testato + `.test.ts` (es. `slot-calculator.test.ts`)
- **Cartelle**: `kebab-case` (es. `customer-codes/`)
- **Variabili**: `camelCase`
- **Costanti**: `UPPER_SNAKE_CASE` (es. `MIN_ORDER_AMOUNT_EUR`)
- **Tipi/Interfaces**: `PascalCase`, senza prefisso `I` (es. `Order`, non `IOrder`)
- **Funzioni**: verbo + sostantivo (es. `calculateSlotCapacity()`, non `slotCapacity()`)
- **Componenti**: sostantivo (es. `<SlotPicker>`, non `<PickSlot>`)
- **Booleans**: `is`, `has`, `can`, `should` (es. `isOpen`, `hasMinimumAmount`)

---

## 4. Multi-tenancy

Il sistema è multi-tenant fin dal primo giorno. Anche se al lancio c'è UN solo ristorante, ogni decisione tiene conto della futura presenza di N tenant.

### 4.1 Modello "shared database, shared schema"

Tutti i tenant condividono:

- Stesso database PostgreSQL
- Stesso schema (stesse tabelle)
- Stesse colonne

Sono separati a livello logico tramite **`tenant_id`** in ogni tabella di business.

**Alternative scartate**:

- Database separato per tenant: troppo costoso, complesso da gestire
- Schema separato per tenant: complica le migrazioni

### 4.2 Identificazione del tenant

Ci sono 3 modi in cui l'app capisce quale tenant sta servendo:

**Per i clienti (app cliente)**:

1. **Subdomain** (futuro): `cinese-livorno.wormhole-local.it` → tenant "cinese-livorno"
2. **Path** (v0): `/r/[tenantSlug]/...` → es. `/r/cinese-livorno/menu`
3. **QR code / link diretto**: stesso pattern, viene risolto dal middleware

**Per la titolare (app titolare)**:

- Login → token sessione contiene `tenant_id`
- Tutte le query usano quel `tenant_id` automaticamente

**Per Stefano (admin)**:

- Vede tutti i tenant
- Può "impersonare" un tenant per debug (selector in alto a destra)

### 4.3 Filtraggio query: Row Level Security (RLS)

Su Supabase configuriamo **Row Level Security policies** per ogni tabella:

```sql
-- Esempio per tabella menu_items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- I clienti vedono solo i piatti del tenant nel loro contesto
CREATE POLICY "Clienti vedono menu del tenant corrente"
  ON menu_items FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- La titolare modifica solo il proprio menu
CREATE POLICY "Titolare modifica solo proprio menu"
  ON menu_items FOR ALL
  USING (tenant_id = (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));
```

**Anti-pattern da evitare**: query lato applicazione che dimenticano `WHERE tenant_id = X`. Con RLS, anche se uno dimentica, il database stesso blocca. È una rete di sicurezza importantissima.

### 4.4 Cosa varia tra tenant

Ogni tenant ha la sua configurazione:

- Nome ristorante, logo, colori brand
- Menu (categorie, piatti, prezzi)
- CAP serviti + tariffe consegna per CAP
- Orari di apertura settimanali
- Giorni di chiusura (martedì per la cinese)
- Numero rider per giorno della settimana
- Capacità slot (quante consegne contemporanee per slot)
- Durata slot (15, 20, 30 minuti — configurabile)
- Soglia minima ordine
- Resto massimo gestito dai rider
- Tempo preparazione per piatto

### 4.5 Cosa è condiviso tra tenant

Cose comuni a tutti (in tabelle senza `tenant_id`):

- Algoritmi di calcolo (slot, codici, distanze)
- Codici postali italiani (anagrafica geografica)
- Sistema di autenticazione utenti

---

## 5. Modello di autenticazione

### 5.1 Tre tipi di utenti

| Tipo         | Accesso        | Come si autentica                            | Cosa può fare                        |
| ------------ | -------------- | -------------------------------------------- | ------------------------------------ |
| **Cliente**  | App cliente    | Telefono + nome al primo ordine, no password | Ordinare, vedere storico             |
| **Titolare** | App titolare   | Email + password (Supabase Auth)             | Gestire ordini del proprio tenant    |
| **Admin**    | Pannello admin | Email + password + 2FA                       | Gestire tutti i tenant, vedere tutto |

### 5.2 Autenticazione cliente: ibrida senza password

Filosofia: **massima friction-less per cliente**.

**Primo ordine**:

1. Cliente compila form: nome, telefono, indirizzo
2. App genera codice univoco di 4 cifre (per la consegna)
3. Cliente vede il codice e gli si dice "tienitelo a mente per i prossimi ordini"
4. Cliente può spuntare "Salva i miei dati per ordini futuri" (con consenso GDPR esplicito)
5. Se spunta: i dati vengono salvati associati al numero di telefono
6. Cliente conferma e ordina

**Ordini successivi**:

1. Cliente apre l'app, inserisce il telefono
2. App verifica se esiste un record con quel telefono per quel tenant
3. Se sì: precompila nome + indirizzo (modificabili)
4. Se no: trattalo come primo ordine

**Sicurezza**:

- Non c'è password
- Non c'è "rubacchiare account" perché non ci sono account formali
- Limite: chiunque conosca il telefono di Mario può ordinare a nome di Mario all'indirizzo di Mario
- Mitigation: notifica push/email a Mario quando viene fatto ordine al suo nome
- Per ordini > 50€: chiamata di conferma manuale da titolare (configurabile)

### 5.3 Autenticazione titolare: Supabase Auth

Sistema standard email + password tramite Supabase Auth.

- Email creata da Stefano per la titolare al setup
- Password sicura (min 12 caratteri, requisiti complessità)
- Reset password via email
- Sessione persistente (la titolare non deve rifare login ogni giorno)
- Logout esplicito disponibile

**Multi-device**: la titolare può accedere da telefono + tablet contemporaneamente. Le notifiche arrivano su entrambi.

### 5.4 Autenticazione admin: 2FA obbligatoria

Per il pannello admin (Stefano):

- Email + password
- **2FA obbligatoria** (TOTP con Google Authenticator / Authy)
- Sessione più corta (max 8 ore)
- Log audit di tutte le azioni

---

## 6. Modello di dominio (entità principali)

Qui descrivo le entità principali. Il dettaglio completo del database schema è in `DATABASE_SCHEMA.md`.

### 6.1 Tenant (Ristorante)

```typescript
interface Tenant {
  id: UUID
  slug: string // es. "cinese-livorno" (URL-friendly)
  name: string // "Ristorante Cinese USDT"
  address: string
  postalCode: string // CAP base del ristorante
  city: string
  country: string // ISO code, default "IT"
  phone: string
  email: string
  logoUrl: string | null
  brandColor: string // hex, default verde Wormhole
  status: 'active' | 'inactive' | 'suspended'

  // Configurazioni operative
  config: TenantConfig

  // Timestamps
  createdAt: timestamp
  updatedAt: timestamp
}

interface TenantConfig {
  // Slot
  slotDurationMinutes: 15 | 20 | 30 // default 30
  deliveryWindowStart: time // "19:00"
  deliveryWindowEnd: time // "22:00"

  // Operatività settimanale
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
  minOrderAmount: number // 10.00 (in euro)
  maxCashChange: number // 50.00 (resto massimo)

  // Tempi preparazione
  defaultPrepTimeMinutes: number // 10 (fallback se piatto non lo specifica)
  prepTimeBufferPerItem: number // 1 (buffer per ogni piatto extra)

  // Pagamenti
  paymentMethods: ('cash' | 'card')[] // v0: ['cash'], poi ['cash', 'card']

  // Notifiche
  notifyOwnerOnNewOrder: boolean // true
  notifyCustomerOnStatus: boolean // true
}

interface DayConfig {
  isOpen: boolean
  riderCount: number // 1 o 2 a seconda del giorno
  ordersPerSlot: number // capacità ordini contemporanei per slot
}
```

### 6.2 MenuItem (Piatto)

```typescript
interface MenuItem {
  id: UUID
  tenantId: UUID // FK a tenant

  // Identificazione
  name: string // "Spaghetti di soia con verdure"
  description: string | null
  category: string // "Primi", "Secondi", "Sushi", etc.
  sortOrder: number // per ordinare i piatti nella stessa categoria

  // Economia
  price: number // in centesimi (es. 1250 = 12.50€) - eviti floating point
  vatRate: 10 | 22 // IVA ridotta (cibo) o ordinaria (bevande)

  // Operatività
  prepTimeMinutes: number // 5, 8, 15, etc.
  isAvailable: boolean // marcato come esaurito o no
  imageUrl: string | null

  // Metadati
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Decisione importante: prezzi in centesimi.**

Usiamo `integer` (centesimi) invece di `decimal/float` per i prezzi. Questo elimina:

- Errori di arrotondamento floating point
- Calcoli sbagliati (es. `0.1 + 0.2 = 0.30000000000000004`)
- Problemi di conversione tra database e applicazione

Convenzione: tutto in centesimi nel DB, conversione a euro solo al momento di mostrarli all'utente.

### 6.3 Customer (Cliente)

```typescript
interface Customer {
  id: UUID
  tenantId: UUID // un cliente è associato a un tenant
  // (lo stesso telefono può essere customer
  // diverso in tenant diversi)

  // Identità
  phone: string // chiave naturale, normalizzata (+39...)
  name: string
  email: string | null

  // Codice univoco
  deliveryCode: string // 4 cifre, fisso per sempre per questo cliente
  // unique per tenant

  // Dati salvati (opzionali)
  defaultAddress: Address | null
  hasConsentedDataStorage: boolean // GDPR

  // Statistiche
  totalOrders: number // contatore denormalizzato
  totalSpentCents: number // denormalizzato per analytics

  // Timestamps
  firstOrderAt: timestamp
  lastOrderAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}

interface Address {
  street: string // "Via XX Settembre 15"
  postalCode: string // "57125"
  city: string // "Livorno"
  buildingNumber: string | null // "15A" se specificato
  floor: string | null // "Scala B, piano 3" libero
  notes: string | null // "citofono Bianchi"
}
```

### 6.4 Order (Ordine)

```typescript
interface Order {
  id: UUID
  tenantId: UUID
  customerId: UUID

  // Identificazione human-friendly
  orderNumber: string // "#1547" - sequenziale per tenant

  // Contenuto
  items: OrderItem[] // snapshot dei piatti
  subtotalCents: number // somma prezzi piatti
  deliveryFeeCents: number // tariffa consegna per quel CAP
  totalCents: number // subtotal + delivery

  // Consegna
  deliveryAddress: Address
  deliveryPostalCode: string
  scheduledSlot: timestamp // es. "2026-05-15 19:30:00"
  deliveryCode: string // copia dal Customer (per sicurezza)

  // Pagamento
  paymentMethod: 'cash' | 'card'
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'

  // Per pagamento contanti
  customerPayingWithCents: number | null // 3000 (paga con 30€)
  changeToGiveCents: number | null // 250 (resto 2.50€)

  // Per pagamento online (futuro)
  stripePaymentIntentId: string | null
  stripeChargeId: string | null

  // Stato
  status: OrderStatus
  rejectionReason: string | null

  // Tracciabilità
  statusHistory: StatusChange[]

  // Note
  customerNotes: string | null

  // Tempi
  createdAt: timestamp
  acceptedAt: timestamp | null
  readyAt: timestamp | null
  deliveredAt: timestamp | null
  cancelledAt: timestamp | null
}

type OrderStatus =
  | 'pending' // cliente ha inviato, titolare non ha ancora visto
  | 'accepted' // titolare ha accettato
  | 'preparing' // in preparazione (automatico dopo accept)
  | 'ready' // titolare ha marcato pronto
  | 'in_delivery' // rider ha preso in consegna
  | 'delivered' // consegnato (rider conferma)
  | 'cancelled' // annullato

interface OrderItem {
  menuItemId: UUID
  name: string // snapshot del nome al momento dell'ordine
  unitPriceCents: number // snapshot del prezzo
  quantity: number
  totalCents: number // unitPrice * quantity
  prepTimeMinutes: number // snapshot anche del tempo prep
}

interface StatusChange {
  status: OrderStatus
  at: timestamp
  byUserId: UUID | null // null se cambio automatico
  reason: string | null
}
```

**Decisione: snapshot dei piatti.**

Salviamo `name`, `unitPriceCents`, `prepTimeMinutes` direttamente in `OrderItem` (non solo `menuItemId`). Motivazione:

- Se la titolare cambia il prezzo di un piatto, gli ordini storici devono mostrare il prezzo vecchio
- Se un piatto viene eliminato, lo storico ordine deve restare leggibile
- Reporting più affidabile

### 6.5 Slot (slot di consegna)

Gli slot non sono entità persistenti separate, sono **calcolati on-the-fly** ogni volta che il cliente apre la pagina di checkout.

```typescript
interface AvailableSlot {
  startTime: timestamp // "2026-05-15 19:30:00"
  endTime: timestamp // "2026-05-15 20:00:00" (start + slotDuration)
  remainingCapacity: number // quanti ordini ancora accettabili
  isRecommended: boolean // true per il primo slot disponibile
  isAvailable: boolean // false se pieno o impossibile
  unavailabilityReason: string | null
  // "Slot già pieno" | "Tempo di preparazione troppo lungo" |
  // "CAP non compatibile con altri ordini di questo slot"
}
```

L'algoritmo è in `packages/core/src/slots/calculator.ts`. Vedi `FEATURE_SPECS.md` sezione 4 per il dettaglio dell'algoritmo.

### 6.6 PostalCode (CAP)

```typescript
interface TenantPostalCode {
  tenantId: UUID
  postalCode: string // "57125"
  city: string
  isServed: boolean // true se questo CAP è servito da questo tenant
  deliveryFeeCents: number // 250 = 2.50€
  zone: 'near' | 'medium' | 'far' // categoria visiva, opzionale

  // Coordinate centrali del CAP (per calcolo distanza)
  latitude: number | null
  longitude: number | null

  // Distanza dal ristorante (km in linea d'aria)
  distanceFromRestaurantKm: number | null
}
```

### 6.7 Feedback

```typescript
interface Feedback {
  id: UUID
  tenantId: UUID
  orderId: UUID // ogni ordine può avere max 1 feedback
  customerId: UUID

  // Voto
  rating: 1 | 2 | 3 | 4 | 5

  // Commento opzionale
  comment: string | null

  // Visibilità
  isInternal: true // SEMPRE true in v0: visibile solo a titolare

  // Timestamp
  createdAt: timestamp
}
```

---

## 7. Sicurezza

### 7.1 Principi

1. **Defense in depth**: più livelli di protezione (RLS DB + validazione API + validazione client)
2. **Least privilege**: ogni utente ha esattamente i permessi necessari
3. **Audit trail**: ogni azione importante è loggata
4. **Privacy by design**: salviamo il minimo necessario

### 7.2 Protezione API

Ogni endpoint deve verificare:

1. **Autenticazione**: l'utente è loggato?
2. **Autorizzazione**: l'utente può fare questa azione?
3. **Tenant scope**: la risorsa appartiene al tenant dell'utente?
4. **Validazione input**: i dati sono validi (Zod schemas)?
5. **Rate limiting**: l'utente non sta abusando?

Esempio pattern in Server Action:

```typescript
'use server'

export async function acceptOrder(orderId: string) {
  // 1. Auth
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()

  // 2. Authz
  if (user.role !== 'owner' && user.role !== 'admin') {
    throw new ForbiddenError()
  }

  // 3. Tenant scope
  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, orderId),
      eq(orders.tenantId, user.tenantId)
    )
  })
  if (!order) throw new NotFoundError()

  // 4. Validazione stato
  if (order.status !== 'pending') {
    throw new InvalidStateError('Ordine già processato')
  }

  // 5. Esegui azione
  await db.update(orders).set({...}).where(eq(orders.id, orderId))

  // 6. Log audit
  await logAudit({ userId: user.id, action: 'accept_order', orderId })

  // 7. Side effects (notifiche)
  await notifyCustomerOrderAccepted(order.customerId, order.id)
  await printOrderTicket(order)

  return { success: true }
}
```

### 7.3 Rate limiting

Limiti per evitare abusi:

| Endpoint                            | Limite          | Motivazione                   |
| ----------------------------------- | --------------- | ----------------------------- |
| POST /api/orders (creazione ordine) | 5/min per IP    | Anti-spam ordini              |
| POST /api/customers (registrazione) | 3/min per IP    | Anti-bot                      |
| GET /api/menu                       | 60/min per IP   | Generoso, navigazione normale |
| POST /api/auth/login (titolare)     | 5/min per email | Anti-brute force              |

Implementazione: usare Vercel Edge Config o Upstash Rate Limit (free tier).

### 7.4 Sanitizzazione input

- Tutti gli input utente passano per **Zod schemas** in `packages/shared/validations`
- Niente SQL injection grazie a Drizzle (query parametrizzate)
- Niente XSS grazie a React (escaping automatico)
- Sanitizzazione HTML solo dove serve (es. note ordini): usare `dompurify`

### 7.5 Cookie e sessioni

- **HttpOnly cookies** per token di sessione (no JS access)
- **Secure flag** (solo HTTPS, automatico su Vercel)
- **SameSite: Lax** (default sicuro)
- **Sessione cliente**: persistente, lunga durata (1 anno)
- **Sessione titolare**: 30 giorni con sliding expiration
- **Sessione admin**: 8 ore massimo

### 7.6 Audit log

Tabella `audit_log` registra tutte le azioni sensibili:

```typescript
interface AuditLog {
  id: UUID
  userId: UUID | null // null per azioni anonime cliente
  tenantId: UUID
  action: string // 'accept_order', 'change_menu_price', etc.
  resourceType: string // 'order', 'menu_item', 'tenant_config'
  resourceId: string
  metadata: Record<string, unknown> // dati extra (vecchio valore, nuovo valore)
  ipAddress: string
  userAgent: string
  createdAt: timestamp
}
```

Retention: 1 anno, poi archiviazione cold storage.

---

## 8. Privacy & GDPR

### 8.1 Dati personali raccolti

| Tipo dato          | Da chi   | Base giuridica                          | Retention                           |
| ------------------ | -------- | --------------------------------------- | ----------------------------------- |
| Nome               | Cliente  | Esecuzione contratto                    | Fino a richiesta cancellazione      |
| Telefono           | Cliente  | Esecuzione contratto                    | Fino a richiesta cancellazione      |
| Indirizzo consegna | Cliente  | Esecuzione contratto                    | Fino a richiesta cancellazione      |
| Email (opzionale)  | Cliente  | Consenso esplicito                      | Fino a revoca consenso              |
| Storico ordini     | Cliente  | Esecuzione contratto + obblighi fiscali | 10 anni (obblighi fiscali italiani) |
| Email              | Titolare | Esecuzione contratto                    | Durata rapporto + 1 anno            |
| Foto piatti        | Tenant   | Esecuzione contratto                    | Durata rapporto                     |
| IP / User Agent    | Auto     | Legittimo interesse (sicurezza)         | 6 mesi                              |

### 8.2 Cosa NON raccogliamo

- Dati di pagamento carte (li gestisce Stripe quando attivato)
- Cookie di tracciamento di terze parti
- Posizione GPS precisa (solo CAP per zona)
- Dati biometrici
- Dati sensibili (salute, religione, ecc.)

### 8.3 Diritti dell'interessato

L'app deve permettere al cliente di:

1. **Accesso**: scaricare tutti i propri dati (JSON export)
2. **Rettifica**: modificare nome, telefono, indirizzo
3. **Cancellazione**: eliminare il proprio account
   - I dati ordine restano (anonimizzati: `customerId` viene staccato)
   - Per obblighi fiscali, gli scontrini emessi non possono essere cancellati
4. **Opposizione**: revocare consenso al salvataggio dati

UI in `/app/profile/privacy` con questi 4 bottoni chiari.

### 8.4 Privacy Policy e Termini

L'app mostra al primo utilizzo:

- **Privacy Policy** (link nel footer sempre)
- **Termini di Servizio** (link nel footer sempre)
- **Cookie banner** (solo cookie essenziali, banner minimale conforme)

Testi forniti da Stefano al setup (preparati da avvocato).

### 8.5 Data Processing Agreement

Quando entrano nuovi tenant, Stefano firma un **Data Processing Agreement (DPA)** con loro:

- Wormhole Local è il **responsabile del trattamento**
- Il tenant è il **titolare del trattamento** dei dati dei suoi clienti
- Il DPA specifica responsabilità reciproche

Stefano gestisce questa parte, non è codice.

---

## 9. Performance

### 9.1 Obiettivi di performance

| Metrica                            | Target  | Misura           |
| ---------------------------------- | ------- | ---------------- |
| **First Contentful Paint (FCP)**   | < 1.5s  | Lighthouse       |
| **Largest Contentful Paint (LCP)** | < 2.5s  | Core Web Vitals  |
| **Time to Interactive (TTI)**      | < 3.5s  | Lighthouse       |
| **Cumulative Layout Shift (CLS)**  | < 0.1   | Core Web Vitals  |
| **First Input Delay (FID)**        | < 100ms | Core Web Vitals  |
| **API response time (p95)**        | < 300ms | server logs      |
| **Database query time (p95)**      | < 50ms  | Supabase metrics |

### 9.2 Strategie

**Per il frontend**:

- Server Components di default, Client Components solo dove serve interattività
- Code splitting automatico per route
- Next.js Image con lazy loading per foto piatti
- Tailwind purga CSS non usato
- Prefetch link nel menu

**Per il backend**:

- Query ottimizzate con indici corretti (vedi DATABASE_SCHEMA.md)
- Connection pooling Supabase
- Caching aggressivo dove possibile (menu cambia raramente)

**Per le immagini**:

- Foto piatti: max 800x800px, formato WebP
- Logo tenant: max 200x200px
- Compressione automatica via Supabase Storage transforms

**Per le PWA**:

- Service Worker con caching strategico
- App shell precaricato
- Offline-first per visualizzazione menu

### 9.3 Limiti accettabili

Wormhole Local non è Twitter. Numeri attesi:

- 500-2000 ordini/mese per tenant
- 50-200 utenti attivi giornalieri per tenant
- 1-10 tenant in primo anno

Con questi volumi, Supabase Free tier e Vercel Hobby reggono tranquillamente.

---

## 10. Testing strategy

### 10.1 Cosa testiamo

**Test unitari (Vitest)** — copertura ~80%

- Tutta la logica in `packages/core` (slot calculator, cart, codici, distanze)
- Validazioni Zod
- Utility functions

**Test integrazione** — punti critici

- Server Actions complete (con DB di test)
- API endpoints
- Flussi multi-step (creazione ordine end-to-end logico)

**Test E2E (Playwright)** — flussi user critici

- Cliente: navigazione → carrello → checkout → conferma
- Titolare: login → ricezione ordine → accettazione → marca pronto
- Admin: login → vedi tenant → modifica config

**Cosa NON testiamo molto**:

- Componenti UI banali (un bottone è un bottone)
- Configurazioni statiche

### 10.2 Database di test

- Database PostgreSQL locale (Docker compose) per test in CI
- Fixtures di seed per scenari comuni
- Reset DB tra ogni suite di test
- Mai test su database di produzione

### 10.3 Quando scrivere test

**SEMPRE prima di committare** una nuova feature, almeno un test unitario base.

**Prima di rilasciare** una versione (`main` merge): tutti i test passano.

**Quando trovi un bug**: regression test che riproduca il bug, poi fixalo.

### 10.4 Continuous Integration

GitHub Actions esegue su ogni push:

1. Lint (ESLint + Prettier check)
2. Typecheck (`tsc --noEmit`)
3. Unit tests (Vitest)
4. Build production (verifica che compili)
5. (Opzionale, lento) E2E test su preview deployment

Se uno step fallisce, commit non passa. Niente merge su `main` senza CI verde.

---

## 11. Deployment

### 11.1 Ambienti

| Ambiente       | URL                           | Branch       | Scopo             |
| -------------- | ----------------------------- | ------------ | ----------------- |
| **Local**      | localhost:3000                | (dev locale) | Sviluppo          |
| **Staging**    | wormhole-local-dev.vercel.app | `dev`        | Test continuativo |
| **Production** | wormhole-local.it (in futuro) | `main`       | Lancio reale      |

### 11.2 Variabili d'ambiente

Esempio `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://..."
SUPABASE_URL="https://...supabase.co"
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Auth
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SESSION_SECRET="..."

# Email
RESEND_API_KEY="..."

# Feature flags
NEXT_PUBLIC_STRIPE_ENABLED="false"
NEXT_PUBLIC_FEEDBACK_ENABLED="true"

# Stripe (predisposto, non attivo)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=""

# Notifications
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."

# Admin
ADMIN_INITIAL_EMAIL="founder@wormholenetwork.io"

# Logging
LOG_LEVEL="info"
```

Tutte le variabili sono validate al boot tramite Zod schema in `packages/shared/src/env.ts`.

### 11.3 Deploy strategy

- Push su `dev` → deploy automatico su staging Vercel
- Push su `main` → deploy automatico su produzione (solo dopo lancio)
- Rollback: revert commit + push (Vercel deploya automaticamente la versione precedente)

### 11.4 Migrazione database

- Migrazioni gestite con `drizzle-kit`
- File migrazione committati in `packages/database/migrations/`
- Migrations applicate automaticamente al deploy (script `prebuild`)
- Mai modificare migrazioni passate, sempre crearne di nuove

---

## 12. Monitoring e logging

### 12.1 Logging

Usa un logger strutturato (es. `pino`):

```typescript
import { logger } from '@/lib/logger'

logger.info({ orderId, customerId }, 'Order created')
logger.error({ err, orderId }, 'Failed to process order')
```

Livelli:

- `error`: errori che richiedono attenzione
- `warn`: situazioni anomale gestite
- `info`: eventi business importanti (ordine creato, accettato, consegnato)
- `debug`: dettagli per troubleshooting (off in prod)

### 12.2 Error tracking

Per fase iniziale di sviluppo: log su console + Vercel Logs è sufficiente.

Più avanti (post-lancio), integrare **Sentry** (free tier 5k errori/mese):

- Notifica errori in tempo reale
- Stack trace completi
- Replay sessioni utente quando c'è errore

### 12.3 Metriche di business

Dashboard semplici in `/admin` per vedere:

- Ordini totali (giorno/settimana/mese)
- Fatturato (giorno/settimana/mese)
- Ordine medio
- Piatti più ordinati
- Orari di punta
- Tasso di rifiuto ordini
- Tempo medio di consegna

Non serve uno strumento esterno (PostHog, Mixpanel) per ora. Query SQL dirette al DB sono sufficienti.

---

## 13. Internazionalizzazione (i18n)

### 13.1 Decisione: solo italiano in v0

Non implementiamo i18n. Tutte le stringhe sono in italiano, hard-coded nel codice.

**Motivazione**:

- Il ristorante pilota è italiano, clientela italiana
- Aggiungere i18n complica tutto per zero valore immediato
- Quando servirà (futuro espansione), si introduce `next-intl` o simile

**Eccezione**: le costanti formattazione (date, valute, numeri) usano `Intl.DateTimeFormat`, `Intl.NumberFormat` con locale `it-IT`.

```typescript
// packages/shared/src/utils/formatters.ts
export const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
```

### 13.2 Timezone

Tutto il sistema lavora in **Europe/Rome**. Costante centralizzata.

I timestamp nel DB sono in **UTC** (best practice), ma sempre convertiti a Europe/Rome quando mostrati all'utente.

---

## 14. Note finali importanti

### 14.1 Cose che NON sono nelle specifiche

Durante lo sviluppo, troverai situazioni non coperte qui. **È normale.** Le specifiche coprono i punti importanti, non ogni dettaglio.

Quando trovi un caso non coperto:

1. **Decidi tu** la cosa più sensata
2. **Documenta** in `DECISIONS.md` con motivazione
3. **Vai avanti** senza bloccarti
4. Stefano rivedrà nel weekly report e può cambiare se non gli piace

### 14.2 Cose che NON devi fare

- **NON cambiare lo stack** senza approvazione (es. niente Vue, niente MongoDB)
- **NON usare servizi a pagamento** senza approvazione esplicita
- **NON committare segreti** (chiavi API, password)
- **NON eliminare migration** passate
- **NON rompere `dev` con commit non testati**
- **NON disabilitare RLS** sul database
- **NON ignorare errori** silenziosamente (loggali sempre)

### 14.3 Cose che DEVI fare

- **Documentare ogni decisione** importante
- **Aggiornare PROGRESS.md** ogni giorno di lavoro
- **Aprire Weekly Report** ogni venerdì
- **Test prima di commit** (almeno test unitari della logica nuova)
- **Tenere `dev` sano** (build verde, test verdi)
- **Comunicare problemi** in Issue, non in silenzio
- **Pulire codice morto** quando lo trovi
- **Chiedere a Stefano** solo per cose veramente strategiche (rare)

---

**Versione documento**: 1.0
**Data**: Maggio 2026
**Autore**: Stefano Colombini (CEO)
**Stato**: Approvato per inizio sviluppo
**Documenti correlati**: README.md, GITHUB_SETUP.md, FEATURE_SPECS.md, DATABASE_SCHEMA.md
