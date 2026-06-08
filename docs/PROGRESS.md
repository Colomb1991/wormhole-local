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
