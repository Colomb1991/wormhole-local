# Wormhole Local

> Multi-tenant food delivery PWA — versione 0 del progetto Wormhole.

[![CI](https://github.com/Colomb1991/wormhole-local/actions/workflows/ci.yml/badge.svg)](https://github.com/Colomb1991/wormhole-local/actions/workflows/ci.yml)

Wormhole Local è una Progressive Web App multi-tenant per food delivery dedicata
a ristoranti singoli. È composta da tre interfacce che condividono lo stesso
backend: app cliente (PWA), app titolare (PWA), pannello admin (web).

## Stato

🚧 In sviluppo attivo — non ancora deployato in produzione.

## Stack

- **Framework**: Next.js 15 (App Router) + React 19
- **Linguaggio**: TypeScript strict
- **Database**: PostgreSQL via Supabase
- **ORM**: Drizzle
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State**: Zustand + TanStack Query
- **Hosting**: Vercel (Hobby)
- **Test**: Vitest + Playwright

## Struttura monorepo

```
apps/
  client/   App cliente PWA
  owner/    App titolare PWA
  admin/    Pannello admin

packages/
  database/  Schema Drizzle, migrazioni, seed
  shared/    Tipi, costanti, validazioni Zod, utility
  ui/        Componenti UI condivisi (shadcn/ui)
  core/      Logica business (slot, carrello, codici, distanze, etc.)
```

## Quickstart sviluppo locale

Prerequisiti: Node 20+, pnpm 9+.

```bash
# 1. Installa dipendenze
pnpm install

# 2. Copia env template e compila valori reali
cp .env.example .env.local
# (modifica .env.local con i valori del tuo Supabase project)

# 3. Genera client Drizzle e applica schema al DB
pnpm db:push

# 4. Popola dati di esempio
pnpm db:seed

# 5. Avvia in dev (tutte e tre le app in parallelo)
pnpm dev
```

Le app girano su:

- Cliente: http://localhost:3000
- Titolare: http://localhost:3001
- Admin: http://localhost:3002

## Documentazione

Tutta la documentazione tecnica è in [`/docs`](./docs):

- [`README.md`](./docs/README.md) — Manuale di benvenuto
- [`GITHUB_SETUP.md`](./docs/GITHUB_SETUP.md) — Convenzioni Git, commit, Issue
- [`MASTER_SPEC.md`](./docs/MASTER_SPEC.md) — Architettura tecnica completa
- [`FEATURE_SPECS.md`](./docs/FEATURE_SPECS.md) — Specifiche dettagliate feature
- [`DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) — Modello dati Drizzle
- [`PROGRESS.md`](./docs/PROGRESS.md) — Diario di sviluppo
- [`DECISIONS.md`](./docs/DECISIONS.md) — Registro decisioni architetturali
- [`KNOWN_ISSUES.md`](./docs/KNOWN_ISSUES.md) — Bug noti, debiti tecnici

## License

MIT — vedi [LICENSE](./LICENSE).
