# Sessione 2026-06-08 — Setup iniziale (passi 2-5 di SETUP.md)

> Report dettagliato pensato per essere letto da un altro Claude (o da Stefano)
> che non sa nulla di come è andata questa sessione. Complemento dettagliato di
> `docs/PROGRESS.md`. Vedi `docs/DECISIONS.md` ADR-001 per il workflow in tandem.

---

## Contesto e attori

- **Esecutore sul repo:** Claude Code locale (questa sessione).
- **Consulente di pianificazione:** Claude Opus 4.8 (interfaccia web).
- **Ponte e arbitro:** Stefano Colombini (incolla output tra i due, conferma i
  passi sensibili).
- **Punto di partenza:** scaffolding del monorepo già generato da Claude Opus
  web in una sessione precedente. Tutti i file presenti, ma il repo NON era
  ancora versionato (nessun commit), le dipendenze non installate, lo schema non
  applicato al DB.

## Obiettivo della sessione

Eseguire i passi **2, 3, 4, 5** di `SETUP.md`, fermandosi a ogni passo per
conferma di Stefano:

- Passo 2: installare le dipendenze.
- Passo 3: verifiche locali (test, typecheck, lint).
- Passo 4: applicare lo schema al DB Supabase reale + seed.
- Passo 5: primo commit e push su GitHub (branch `main` + `dev`).

I passi 6 (branch protection + label GitHub) e 7 (deploy Vercel) sono manuali,
li fa Stefano via browser.

## Ambiente

- Windows 11, PowerShell 5.1. Node v22.13.1.
- Working dir: `C:\Users\admin\Desktop\wormhole-local\wormhole-local`.

---

## Cronaca: comandi eseguiti e loro esito

### Passo 2 — Install

1. `pnpm` non era nel PATH. Il progetto fissa `pnpm@9.15.0`
   (`package.json` → `packageManager`). Attivato via **corepack**:
   - `corepack enable pnpm` → **EPERM** (non può scrivere shim in
     `C:\Program Files\nodejs`, serve admin).
   - Soluzione senza admin: `corepack prepare pnpm@9.15.0 --activate` (scarica
     in cache utente) + `corepack enable --install-directory
     "%LOCALAPPDATA%\pnpm-shim" pnpm` (shim in cartella utente) + aggiunta di
     quella cartella al **PATH utente** (persistente).
   - Gotcha Windows: la modifica al PATH utente non è visibile alle shell già
     avviate. Per questa sessione, ogni comando pnpm è stato prefissato con
     `$env:PATH = "$env:LOCALAPPDATA\pnpm-shim;$env:PATH"`. In terminali NUOVI
     `pnpm` funziona direttamente.
2. `pnpm install` → 455 pacchetti, lockfile invariato (~28s).

### Passo 3 — Verifiche locali

- `pnpm test` → **49 test passati** (Vitest, 5 file).
- `pnpm typecheck` → **0 errori** (7 package).
- `pnpm lint` → **0 warning** (7 package).

### Passo 4 — Schema → DB Supabase reale

1. **Difetto bloccante scoperto** (vedi sotto): `db:generate` falliva. Dopo il
   fix:
2. `pnpm db:generate` → generata la prima migrazione
   `packages/database/migrations/0000_mean_skin.sql` (18 tabelle, 25 FK) +
   `meta/0000_snapshot.json` + `meta/_journal.json`.
3. **Verifica del file SQL** prima di applicarlo: 18 `CREATE TABLE`, 0 `DROP`,
   FK `restrict` su `orders` e `cascade` sui dati figli del tenant, importi in
   centesimi `integer`. Stefano ha confrontato con `DATABASE_SCHEMA.md`: OK.
4. `pnpm db:push` → si connetteva ma si fermava a un **prompt interattivo**
   (per `strict: true` nel `drizzle.config.ts`) non pilotabile dalla shell.
   Scartato a favore di `db:migrate` (vedi problemi sotto).
5. `pnpm db:migrate` → **migrations applied successfully**. Approccio non
   interattivo, applica esattamente lo SQL revisionato e registra lo storico.
6. **Verifica indipendente** interrogando direttamente Postgres
   (`information_schema`): **18 tabelle, 25 FK, 1 migrazione** registrata in
   `drizzle.__drizzle_migrations`.
7. `pnpm db:seed` → tenant `cinese-usdt`, 7 categorie, 8 piatti, 7 CAP, 1
   customer di test (Mario Rossi, code 1234). **Idempotenza verificata**:
   secondo run → "già esistente/presenti", conteggi invariati, nessun errore.

### Passo 5 — Commit e push

- Verifiche di sicurezza PRIMA del commit:
  - `git check-ignore .env.local` → ignorato ✅; `node_modules` → ignorato ✅.
  - Scan git dei file `.env*`: committabile solo `.env.example`; `.env.local`
    ignorato.
- `git init`; `git add -A`; revisione della lista (128 file).
- Esclusi dallo staging 8 file non opportuni: 7× `*.tsbuildinfo` (cache build) +
  `.claude/settings.local.json` (impostazioni locali). Aggiunti a `.gitignore`.
  Creato `.gitattributes` (`* text=auto eol=lf`). Staging finale: **121 file**.
- Commit **`40ac21e`** su `main` (root-commit, 121 file, 19.689 inserzioni).
- `git remote add origin https://github.com/Colomb1991/wormhole-local.git`.
- `git push -u origin main` → ok. `git checkout -b dev` + `git push -u origin
  dev` → ok. CI GitHub Actions avviata.

---

## Problemi incontrati e come risolti

### 1. Import relativi con `.js` rompevano drizzle-kit (difetto dello scaffolding)

- **Sintomo:** `db:generate` → `Error: Cannot find module './tenants.js'`.
- **Causa:** lo scaffolding (generato da Claude Opus web) usava import/export
  relativi con estensione esplicita `.js` (convenzione NodeNext), ma il progetto
  ha `moduleResolution: "bundler"` e i file su disco sono `.ts`. `tsc` e Vitest
  tolleravano (typecheck/test verdi), ma il loader di drizzle-kit cercava
  letteralmente i `.js` e crashava. Per questo la migrazione non era mai stata
  prodotta, nonostante PROGRESS la dichiarasse fatta.
- **Fix (autorizzato da Stefano):** rimosse le estensioni `.js` da tutti gli
  import/export **relativi** nei 4 package interni + 2 script — **57 occorrenze
  in 27 file**. Lasciati intatti `@wormhole/*`, `drizzle-orm/*`, `node:*`.
  Verificato: nessun file `.js` reale, zero specifier `.js` residui. Dopo il
  fix: 49 test verdi, typecheck/lint puliti, `db:generate` funziona.
- **Tracciato in:** `KNOWN_ISSUES.md` RIS-001.

### 2. `db:push` interattivo non pilotabile → adozione di `db:migrate`

- `drizzle-kit push` con `strict: true` (nel `drizzle.config.ts`) mostra un menu
  a frecce di conferma che la shell non interattiva di Claude Code non può
  guidare. Il processo è stato interrotto PRIMA di eseguire qualsiasi statement
  (DB intatto).
- **Decisione:** d'ora in poi lo schema si applica con **`pnpm db:migrate`**
  (non interattivo, applica i file di migrazione revisionati, tiene lo storico).
  `db:push` resta usabile solo manualmente da Stefano se serve.
- **Tracciato in:** `KNOWN_ISSUES.md` (nota db:push).

### 3. `.env.local` mancante e poi malformato (risolto lato utente)

- All'avvio `.env.local` non era nella root (era sul desktop) → spostato da
  Stefano.
- Primo `db:push`: `DIRECT_URL` conteneva ancora il placeholder
  `[YOUR-PASSWORD]` → Stefano ha messo la password reale.
- Secondo tentativo: `DIRECT_URL` iniziava con `//` invece di `postgresql://`
  (schema mancante) → Stefano ha aggiunto `postgresql:`. `DATABASE_URL` era già
  corretta (porta 6543, transaction pooler). Dopo: connessione ok.

### 4. Bug di quoting di PowerShell 5.1 con `git commit -m`

- `git commit -m @'...'@` con virgolette doppie incorporate nel messaggio →
  PowerShell 5.1 spezzava l'argomento e git leggeva pezzi come pathspec.
- **Fix:** messaggio scritto in un file temporaneo e `git commit -F <file>`.
  Da usare per tutti i commit con messaggi multi-riga.

---

## Stato finale

- **DB Supabase:** 18 tabelle, 25 FK, migrazione `0000_mean_skin.sql` registrata,
  seed placeholder caricato e idempotente.
- **Git:** commit `40ac21e` su `main` e `dev`, entrambi pushati su
  `github.com/Colomb1991/wormhole-local` (privato). Branch corrente: `dev`.
- **Qualità:** 49 test, typecheck, lint tutti verdi.
- **Toolchain:** pnpm 9.15.0 via corepack (shim utente nel PATH).

## Cosa resta da fare

- **Stefano, manuale (passo 6):** branch protection su `main`, creare le label
  GitHub (GITHUB_SETUP sez. 5.5).
- **Stefano, manuale (passo 7):** 3 progetti Vercel (client/owner/admin), root
  directory diverse, env vars dal `.env.local`.
- **Sicurezza:** ruotare la **password del DB Supabase** (comparsa in chiaro
  negli output di errore) e aggiornare `.env.local` + env Vercel. Vedi
  KNOWN_ISSUES.
- **Debiti tecnici noti:** DT-001 (dati reali ristorante), DT-002 (geocoding
  CAP), DT-003 (VAPID keys).
- **Prossima feature:** onboarding cliente (sez. 1 di `FEATURE_SPECS.md`).
