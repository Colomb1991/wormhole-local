# Progress Log

Diario di sviluppo giornaliero di Wormhole Local.

Formato: data, sessione, focus, cosa fatto, in sospeso, prossimo.

---

## 2026-06-08 (Lun) — Setup iniziale

**Sessione:** generata in singola sessione Claude (interfaccia web)
**Focus:** Scaffolding completo del monorepo da zero, secondo le specifiche.

### Fatto

- [x] Lettura completa dei 5 documenti di specifica
- [x] Creazione struttura monorepo pnpm: 3 apps + 4 packages
- [x] Configurazione root: `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`,
      `eslint.config.mjs`, `.prettierrc.json`, `vitest.config.ts`, `playwright.config.ts`
- [x] `.gitignore`, `.nvmrc` (Node 20), `LICENSE` MIT, `.env.example` completo
- [x] Schema Drizzle iniziale per le 18 tabelle (vedi `packages/database/src/schema/`)
- [~] Migrazione SQL iniziale: lo scaffolding web aveva dichiarato di averla
      generata, ma in realtà `migrations/` conteneva solo `.gitkeep`. La
      migrazione `0000_mean_skin.sql` (18 tabelle) è stata generata da Claude
      Code nella sessione 2026-06-08, dopo aver risolto il difetto degli import
      con estensione `.js`. Vedi `docs/sessions/2026-06-08-setup-iniziale.md`.
- [x] Core logic implementata con test:
  - `slots/calculator.ts` — algoritmo slot disponibili (sez. 4 FEATURE_SPECS)
  - `cart/calculator.ts` — calcolo prep time e validazioni carrello
  - `customer-codes/generator.ts` — generazione codice 4 cifre univoco per tenant
  - `delivery/haversine.ts` — distanza in linea d'aria tra coordinate
- [x] Validazioni Zod centrali in `packages/shared/src/validations`
- [x] Utility formatter (currency it-IT, date Europe/Rome, phone normalize)
- [x] Constants centralizzati (status, ruoli, timezone, feature flags)
- [x] Apps Next.js 15 con App Router: client (port 3000), owner (3001), admin (3002)
- [x] PWA manifest base per client e owner
- [x] GitHub Actions CI: lint + typecheck + test + build
- [x] Template Issue: feature, bug, weekly_report
- [x] Documenti spec copiati in `/docs`
- [x] Script seed con tenant placeholder "Cinese USDT" + 7 CAP Livorno
- [x] Script `scripts/distances-matrix.ts` per matrice distanze CAP (Nominatim)

### In sospeso

- Configurazione Vercel: 3 progetti separati (client/owner/admin) collegati a
  questo repo, root directory diverse, tutte sullo stesso piano Hobby.
- Generazione VAPID keys per Web Push: comando `npx web-push generate-vapid-keys`
  da eseguire una volta in locale e incollare in `.env.local`.
- Configurazione branch protection su `main` (da fare via web UI GitHub).
- Configurazione label GitHub come da sez. 5.5 di GITHUB_SETUP.md.

### Prossimo (settimana 2)

- Implementare onboarding cliente (sez. 1 FEATURE_SPECS): form telefono +
  riconoscimento esistente / form registrazione + generazione codice.
- Implementare pagina menu (sez. 2 FEATURE_SPECS).
- Implementare carrello (sez. 3 FEATURE_SPECS): Zustand store + persistenza
  localStorage + UI floating bar.
- Iniziare Issue "Weekly Report — Settimana 1" venerdì.

### Note

Scaffolding generato da Claude (interfaccia web) — non da Claude Code locale.
Vedi `DECISIONS.md` ADR-001 per la decisione di workflow tra Stefano e gli
strumenti di sviluppo AI.

---

## 2026-06-08 (Lun) — Setup operativo via Claude Code

**Sessione:** Claude Code locale (esecutore sul repo), in tandem con Claude
Opus 4.8 web (consulente) e Stefano (ponte). Vedi `DECISIONS.md` ADR-001.
**Focus:** Eseguire i passi 2-5 di `SETUP.md`.

### Fatto

- [x] Toolchain: attivato `pnpm@9.15.0` via corepack (shim in `%LOCALAPPDATA%`,
      aggiunto al PATH utente). `pnpm install` → 455 pacchetti.
- [x] Verifiche locali: 49 test (Vitest), typecheck e lint puliti.
- [x] Fix difetto scaffolding: rimosse le estensioni `.js` dagli import
      relativi (57 occorrenze in 27 file) — rompevano drizzle-kit sotto
      `moduleResolution: "bundler"`. Vedi `KNOWN_ISSUES.md` RIS-001.
- [x] `db:generate` → prima migrazione `0000_mean_skin.sql` (18 tabelle, 25 FK).
- [x] Schema applicato al DB Supabase reale con `pnpm db:migrate` (db:push
      scartato perché interattivo — vedi KNOWN_ISSUES).
- [x] Verifica indipendente via Postgres: 18 tabelle, 25 FK, 1 migrazione
      registrata in `drizzle.__drizzle_migrations`.
- [x] `db:seed` → tenant `cinese-usdt`, 7 categorie, 8 piatti, 7 CAP, 1 customer
      di test. Idempotenza verificata (secondo run: nessun duplicato).
- [x] Git: `.gitignore` esteso (`*.tsbuildinfo`, `.claude/`), `.gitattributes`
      (`eol=lf`). Verifica sicurezza: `.env.local` NON committato.
- [x] Primo commit `40ac21e` (121 file); branch `main` e `dev` pushati su
      GitHub. CI GitHub Actions avviata.
- [x] Documentazione: ADR-001 aggiornato (workflow in tandem), creata
      `docs/sessions/` + report `2026-06-08-setup-iniziale.md`, KNOWN_ISSUES
      RIS-001 e note db:push/password.

### In sospeso (passa a Stefano / prossime sessioni)

- Passo 6 (manuale): branch protection su `main` + label GitHub.
- Passo 7 (manuale): deploy 3 progetti Vercel.
- **Rotazione password DB Supabase** (comparsa in chiaro negli output di errore;
  vedi KNOWN_ISSUES). Poi aggiornare `.env.local` ed env Vercel.
- VAPID keys (DT-003), dati reali ristorante (DT-001), distanze CAP (DT-002).

### Prossimo

- Prima feature: onboarding cliente (sez. 1 `FEATURE_SPECS.md`).

### Note

Branch corrente: `dev`. I comandi pnpm di questa sessione usano il prefisso PATH
`%LOCALAPPDATA%\pnpm-shim`; in terminali nuovi `pnpm` funziona diretto. `gh` CLI
non installato: il push ha usato le credenziali già in cache nel Windows
Credential Manager.
