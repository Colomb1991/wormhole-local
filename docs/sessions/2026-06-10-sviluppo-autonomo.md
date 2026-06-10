# Sessione 2026-06-10 — Sviluppo autonomo: menu reale + Feature 1/2/3/5

> Report dettagliato pensato per un altro Claude (o Stefano) che non sa nulla di
> questa sessione. Complemento di `docs/PROGRESS.md` (2026-06-10).
> Vedi anche `DECISIONS.md` ADR-001 (workflow) e `KNOWN_ISSUES.md`.

---

## Contesto

- **Esecutore:** Claude Code locale, sessione **autonoma estesa** ("carta
  bianca": nessuna conferma intermedia richiesta, lavoro fino a esaurimento
  contesto/blocchi).
- **Punto di partenza:** setup completo, DB Supabase vivo (18 tabelle, seed
  placeholder), branch `dev`, CI verde, 49 test.
- **Vincoli rispettati:** solo branch `dev`; nessuna operazione su `main`;
  nessun SQL distruttivo (solo migrazione additiva + insert/update/delete
  mirati di placeholder); `.env.local` mai letto/modificato/committato.
- **Ambiente:** Windows 11, PowerShell. pnpm 9.15.0. Node 22. Per i comandi:
  bash tool con sintassi POSIX (env inline per il build).

## Obiettivo e risultato

Cinque blocchi previsti dal prompt. **Completati: menu reale + Feature 1, 2, 3
e Feature 5 (checkout).** La Feature 4 del prompt ("carrello") coincide con la
Feature 3 di FEATURE_SPECS ed è stata fatta; il "blocco 5" (checkout) è stato
raggiunto.

Stato finale qualità: **typecheck, lint, 66 test, build client** tutti verdi.

---

## Cronaca per blocco

### Blocco 1 — Menu reale "Al Mare" (sostituzione placeholder DT-001)

- **Schema:** aggiunta colonna additiva `menu_items.menu_number` (varchar(10),
  nullable) + vincolo `UNIQUE(tenant_id, menu_number)`. Migrazione generata
  `migrations/0001_silky_sugar_man.sql` (solo ADD COLUMN + ADD CONSTRAINT,
  nessun DROP), revisionata e applicata con `pnpm db:migrate`.
- **Dati:** nuovo file `packages/database/src/seed-menu.ts` con 12 categorie e
  **135 piatti** (134 numerati + il "44a"), prezzi in centesimi, prep time di
  default per categoria. Fonte: `docs/menu-reale.md`.
- **Seed riscritto** (`packages/database/src/seed.ts`) come **riconciliazione
  idempotente** (non più "skip se esiste"):
  - tenant: upsert per slug, aggiorna anagrafica (nome "Al Mare — Ristorante
    Cinese", telefono fisso `+390586807282`, tagline);
  - categorie: upsert per nome, rimozione di quelle obsolete;
  - piatti: upsert per `(tenantId, menuNumber)`, rimozione placeholder/obsoleti;
  - **`isAvailable` NON viene toccato su update** → i toggle "esaurito" del
    titolare sopravvivono a un re-seed.
- **Applicato al DB reale:** 1° run → 135 creati, 8 placeholder rimossi, 6
  categorie obsolete rimosse. **2° run (idempotenza) → 0 create, 135 update, 0
  remove.** ✅
- Commit: menu reale.

### Blocco 2 — Feature 1: Onboarding cliente (FEATURE_SPECS sez. 1)

- **Logica pura in core** `packages/core/src/customers/onboarding.ts`
  (+`onboarding.test.ts`, 7 test): `normalizeCustomerEmail`, `tryNormalizePhone`
  (no-throw), `buildCustomerInsert` (mappa indirizzo, gestisce consenso GDPR →
  `consentGivenAt`).
- **Data layer client** (`apps/client/lib/`):
  - `tenant.ts`: `getTenantBySlug`, `getServedPostalCodes` (memoizzati con
    `cache()` di React).
  - `session.ts`: sessione cliente in **cookie HttpOnly** `wh_customer_session`
    + tabella `customer_sessions` (token 96 char hex, TTL 30 gg).
    `createCustomerSession`, `getCurrentCustomer`, `clearCustomerSession`.
  - `customer-service.ts`: `findCustomerByPhone`, `deliveryCodeExists`.
- **Server Actions** (`app/r/[tenantSlug]/actions.ts`, no-throw, `Result<T>`):
  `identifyCustomerAction` (esistente → sessione + codice; nuovo → telefono
  normalizzato), `registerCustomerAction` (valida con
  `customerRegistrationSchema`, genera codice univoco, anti doppio-submit).
- **UI:** landing tematizzata `page.tsx` + flow a step `OnboardingFlow`
  (telefono → bentornato/registrazione → schermata codice consegna). Componente
  `TenantTheme` (override `--color-primary` dal brand del tenant). Aggiunto
  `Input` a `@wormhole/ui`.

### Blocco 3 — Feature 2: Menu lato cliente (FEATURE_SPECS sez. 2)

- **Logica pura in core** `restaurant/status.ts` (+7 test): `getRestaurantStatus`
  → stato operativo `paused | closed_today | before_window | open |
  after_window`, con indicatore semaforo, messaggi italiani e calcolo del
  prossimo giorno di apertura.
- **Data layer:** `lib/menu.ts` (`getMenuForTenant` raggruppa categorie+piatti,
  esclude soft-deleted, **include** gli "esauriti"; `getTenantPaused`).
- **Store carrello** `lib/cart-store.ts`: Zustand + persist su localStorage,
  **per-tenant** (`ensureTenant` svuota se cambi ristorante).
- **UI:** `MenuView` (header sticky con banner stato + quick-nav categorie,
  card piatto con numero di menu/prezzo/"+"/badge Esaurito, haptic su add) +
  `CartBar` flottante.

### Blocco 4 — Feature 3: Carrello (FEATURE_SPECS sez. 3)

- Pagina `/r/[slug]/cart` + `CartView`: gestione quantità (+/−), subtotale,
  tempo prep stimato, banner "mancano X€" sotto soglia. **Riusa la logica core**
  (`calculateSubtotal`, `calculatePrepTime`, `validateCart`). "Continua" bloccato
  se sotto minimo o ristorante non operativo.

### Blocco 5 — Feature 5: Checkout cash-only + slot (FEATURE_SPECS sez. 7 + 4)

- **Core** `orders/totals.ts` (+3 test): `buildOrderItems`,
  `calculateOrderTotals`.
- **Data layer:** `lib/slots.ts` (`getDeliveryFeeCents`, `getAvailableSlots` —
  carica gli ordini attivi che occupano gli slot e chiama
  `calculateAvailableSlots` di core); `lib/orders.ts` (`createOrder` in
  **transazione** con order number sequenziale, `getMenuItemsByIds`,
  `getOrderForCustomer`).
- **Server Actions:** `getSlotsAction` (solo slot disponibili) e
  `createOrderAction` (ri-validazione integrale lato server: identità,
  **anti-tampering prezzi**, `validateCart`, slot ancora libero,
  `calculateCashChange`).
- **UI:** `CheckoutFlow` (riepilogo, indirizzo precompilato + dropdown CAP con
  tariffa, selezione slot ricaricata al cambio CAP, pagamento alla consegna con
  anteprima resto) + pagina `checkout` (redirect a onboarding senza sessione) +
  pagina conferma `/orders/[id]/confirmed`.

---

## Decisioni tecniche prese in autonomia

1. **`menu_number` come colonna** (non in descrizione): abilita ordini per
   numero in cucina e un seed idempotente per chiave. Varchar per gestire "44a".
2. **Seed riconciliante** invece di skip: necessario per sostituire placeholder
   già nel DB mantenendo l'idempotenza. Le delete sono mirate ai soli
   placeholder (non "DELETE di massa": al 2° run non cancella nulla).
3. **`baseUrl: "."` nella tsconfig del client** (`apps/client/tsconfig.json`):
   l'alias `@/*` non risolveva perché `baseUrl` era ereditato dalla root del
   monorepo e puntava lì. Era un difetto latente mai emerso (nessun `@/` usato
   prima). **Stesso fix andrà fatto su `apps/owner` e `apps/admin`** quando
   useranno `@/`.
4. **`drizzle-orm` aggiunto alle dipendenze di `apps/client`**: il data layer
   usa gli operatori drizzle (`eq`, `and`, …) direttamente.
5. **Pagine che toccano il DB marcate `force-dynamic`**: la CI builda con
   `DATABASE_URL` placeholder (localhost); senza `force-dynamic` Next proverebbe
   a prerenderare e interrogherebbe un DB inesistente. Verificato: tutte le rotte
   tenant risultano `ƒ (Dynamic)` nel build.
6. **`typedRoutes` spostato fuori da `experimental`** in tutti e 3 i
   `next.config.ts` (deprecato in Next 16, eliminava un warning di build).
7. **`isCapCompatible` stub a `true`** (vedi DT-007): la matrice distanze non
   esiste ancora.

## Verifica e come è stato testato

- `pnpm test` → **66 test** (erano 49; +17: onboarding 7, status 7, totals 3).
- `pnpm typecheck` e `pnpm lint` → puliti su 7 package.
- **Build client** verificato localmente con le stesse env placeholder della CI
  (env inline nel comando, `.env.local` mai toccato). Tutte le rotte tenant
  dynamic.
- Seed applicato e **idempotenza verificata** sul DB reale (2 run).
- **NON** è stato creato alcun ordine reale di test (per non sporcare i dati):
  il flusso checkout è coperto da typecheck + build + test delle funzioni pure.

## Stato dei commit

Tutti su `dev`, conventional commits in italiano (`git commit -F`):
1. menu reale (135 piatti, migrazione 0001)
2. Feature 1 — onboarding
3. Feature 2 — menu
4. Feature 3 — carrello (push checkpoint dopo questo)
5. Feature 5 — checkout
6. report + KNOWN_ISSUES (questo commit)

## Cosa NON è stato fatto / prossimi passi

- **Feature 4 FEATURE_SPECS (slot)**: l'algoritmo core era già pronto e testato;
  qui è stato *integrato* nel checkout, ma manca la **compatibilità CAP reale**
  (DT-007) finché la matrice distanze non è popolata (DT-002 → eseguire
  `scripts/distances-matrix.ts`).
- **App titolare (owner)**: ricezione ordini, accept/reject, stampa comanda,
  realtime (FEATURE_SPECS 8-9) — non iniziata. Gli ordini creati dal cliente
  restano `pending` e nessuno li gestisce ancora.
- **Notifiche** (push/email, sez. 11), **stato ordine realtime** (sez. 10),
  **storico/riordina** (12), **feedback** (13), **pannello admin** (14) — da fare.
- **Timeout pending→cancelled** (sez. 10.3) e **annullamento cliente** (sez. 16)
  — non implementati.
- **Verifica prezzi OCR** (DT-008) e dati anagrafici tenant (email, civico).
- **Fix latente**: `baseUrl` in `apps/owner`/`apps/admin` quando serviranno `@/`.

## Note operative per il prossimo Claude

- Il data layer del client sta in `apps/client/lib/*`; le Server Actions accanto
  alle rotte in `app/r/[tenantSlug]/**/actions.ts`.
- La logica di dominio testabile va in `@wormhole/core` (vitest copre
  `packages/**` e `tests/unit/**`, **non** `apps/**`).
- Per buildare il client in locale servono le env (placeholder vanno bene): usa
  lo stesso set della CI in `.github/workflows/ci.yml`.
- Il carrello è client-side (localStorage), per-tenant; il checkout ri-valida
  tutto lato server — non fidarsi mai dei prezzi dal client.
