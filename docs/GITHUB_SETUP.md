# GitHub Setup & Documentation Rules

> **Documento operativo per la gestione del repository GitHub di Wormhole Local.**
> Letto da Claude Code dopo il README, prima del primo commit.

---

## 1. Filosofia di questo documento

Stefano lavora con Claude Code in autonomia totale. Non c'è team, non ci sono review umane sui pull request, non ci sono daily standup. L'unico modo che ha Stefano per **capire cosa hai fatto** è guardare GitHub.

Per questo motivo, le regole di documentazione qui descritte **non sono opzionali**. Ogni commit, ogni issue, ogni file di tracciamento è un canale di comunicazione tra te e Stefano. Se questi canali sono curati bene, Stefano può:

- Capire in 10 minuti cosa è successo in una settimana
- Trovare velocemente quando un bug è stato introdotto
- Rivedere e contestare decisioni che non condivide
- Riprendere il progetto se passa del tempo senza guardarlo

Se questi canali sono curati male, Stefano perderà fiducia nel lavoro fatto.

**Regola d'oro: scrivi documentazione come se la stessi scrivendo per uno sviluppatore che entra nel progetto tra 6 mesi.**

---

## 2. Setup iniziale del repository

### 2.1 Nome del repository

```
wormhole-local
```

Lowercase, separato da trattino. Niente "wormhole_local" o "WormholeLocal".

### 2.2 Visibilità

**Private** durante lo sviluppo. Verrà reso pubblico solo se e quando Stefano deciderà.

### 2.3 Branch principali

| Branch      | Scopo                                                 | Chi pusha               |
| ----------- | ----------------------------------------------------- | ----------------------- |
| `main`      | Produzione, sempre deployabile                        | Solo merge da `dev`     |
| `dev`       | Sviluppo attivo, contiene l'ultima versione di lavoro | Claude Code             |
| `feature/*` | Sviluppo isolato di feature complesse                 | Claude Code (opzionale) |
| `fix/*`     | Bug fix specifici                                     | Claude Code (opzionale) |
| `hotfix/*`  | Fix urgenti in produzione                             | Solo emergenze          |

### 2.4 Strategia di branching

Per la **maggior parte del lavoro**, Claude Code lavora direttamente su `dev`. Niente pull request, niente review.

Usa branch separati (`feature/*`, `fix/*`) **solo quando**:

- Una feature richiede più di 5 giorni di lavoro
- C'è il rischio di rompere parti già funzionanti
- Stai sperimentando un approccio diverso

Quando un branch è pronto, fai merge in `dev` (no pull request necessario, lavori da solo).

**Promozione `dev` → `main`**: solo quando una versione è stabile e testata. Crea un tag (es. `v0.1.0`) e fai il merge. Vedi sezione 7 sui release.

### 2.5 Protezione branch

Configura su GitHub:

- `main`: protetto, push solo via merge da `dev`
- `dev`: nessuna protezione (lavori liberamente)
- `main` richiede status check verdi (build + test passati)

---

## 3. Struttura cartelle del repository

```
wormhole-local/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── feature.md
│   │   ├── bug.md
│   │   └── weekly_report.md
│   └── workflows/
│       └── ci.yml                  # GitHub Actions per test e build
│
├── apps/
│   ├── client/                     # App cliente PWA
│   ├── owner/                      # App titolare PWA
│   └── admin/                      # Pannello admin web
│
├── packages/
│   ├── database/                   # Schema Drizzle, migrazioni
│   ├── shared/                     # Tipi TypeScript condivisi, costanti
│   ├── ui/                         # Componenti UI condivisi (shadcn/ui)
│   └── core/                       # Logica business (calcoli, validazioni)
│
├── docs/                           # Documentazione di sviluppo
│   ├── README.md                   # Specifiche progetto (questo)
│   ├── GITHUB_SETUP.md             # Questo file
│   ├── MASTER_SPEC.md              # Architettura e decisioni
│   ├── FEATURE_SPECS.md            # Specifiche feature
│   ├── DATABASE_SCHEMA.md          # Modello dati
│   ├── PROGRESS.md                 # Diario sviluppo (creato da Claude Code)
│   ├── DECISIONS.md                # Registro decisioni (creato da Claude Code)
│   ├── KNOWN_ISSUES.md             # Bug noti (creato da Claude Code)
│   └── architecture/               # Diagrammi e schemi (opzionale)
│
├── scripts/                        # Script di automazione
│   ├── seed.ts                     # Popola DB con dati di test
│   ├── distances-matrix.ts         # Genera matrice distanze CAP offline
│   └── generate-customer-code.ts   # Test generazione codici univoci
│
├── tests/
│   ├── unit/                       # Test unitari
│   ├── integration/                # Test integrazione
│   └── e2e/                        # Test end-to-end Playwright
│
├── .env.example                    # Template variabili ambiente (committed)
├── .env.local                      # Variabili reali (gitignored)
├── .gitignore
├── .nvmrc                          # Versione Node.js
├── package.json                    # Dipendenze root
├── tsconfig.json                   # TypeScript config
├── tailwind.config.ts
├── drizzle.config.ts
├── playwright.config.ts
├── vitest.config.ts
├── README.md                       # README pubblico del repo (più breve di /docs/README.md)
├── CHANGELOG.md                    # Changelog ufficiale
├── LICENSE                         # MIT o proprietaria (decide Stefano)
└── package-lock.json
```

### 3.1 Note sull'organizzazione

**Monorepo style**: usiamo `apps/` per le tre interfacce e `packages/` per il codice condiviso. Usa pnpm workspaces (preferito) o npm workspaces.

**Perché monorepo e non 3 repo separati**:

- Cambio del database schema deve aggiornare tutte e 3 le app insieme
- Tipi TypeScript condivisi (es. `Order`, `MenuItem`) usati ovunque
- Build unico, deploy coordinato
- Stefano deve vedere tutto in un posto

---

## 4. Convenzioni di commit (OBBLIGATORIE)

### 4.1 Formato dei messaggi di commit

Usa **Conventional Commits** in italiano, con dettaglio esteso:

```
<tipo>(<scope>): <breve descrizione in italiano>

Cosa fa: <spiegazione di cosa fa questo cambiamento>

Perché: <motivazione, problema risolto, contesto>

File toccati:
- <file 1>: <cosa è cambiato>
- <file 2>: <cosa è cambiato>

Test: <quali test sono stati aggiunti o aggiornati>

Riferimenti: #<issue number> (se applicabile)
```

### 4.2 Tipi di commit ammessi

| Tipo       | Quando usarlo                                        |
| ---------- | ---------------------------------------------------- |
| `feat`     | Nuova funzionalità per l'utente                      |
| `fix`      | Bug fix                                              |
| `refactor` | Modifica codice senza cambiare comportamento esterno |
| `style`    | Solo CSS, formattazione, spacing                     |
| `perf`     | Miglioramento performance                            |
| `test`     | Aggiunta o modifica test                             |
| `docs`     | Solo documentazione                                  |
| `chore`    | Task di setup, configurazione, dipendenze            |
| `build`    | Modifiche al sistema di build, CI/CD                 |
| `revert`   | Annullamento di un commit precedente                 |

### 4.3 Scope possibili

| Scope     | Area del progetto                 |
| --------- | --------------------------------- |
| `client`  | App cliente                       |
| `owner`   | App titolare                      |
| `admin`   | Pannello admin                    |
| `db`      | Database, migrazioni, schema      |
| `auth`    | Autenticazione                    |
| `cart`    | Carrello                          |
| `order`   | Gestione ordini                   |
| `menu`    | Gestione menu                     |
| `slot`    | Slot orari di consegna            |
| `cap`     | Gestione CAP e tariffe            |
| `printer` | Integrazione stampante            |
| `payment` | Pagamenti (anche se disabilitati) |
| `notif`   | Notifiche                         |
| `setup`   | Configurazione progetto           |

### 4.4 Esempi di commit fatti BENE

**Esempio 1 — Feature commit:**

```
feat(slot): aggiunta logica calcolo slot disponibili in base a tempo preparazione

Cosa fa: implementa la funzione getAvailableSlots() che restituisce
solo gli slot di consegna effettivamente raggiungibili in base al
tempo di preparazione totale dell'ordine.

Perché: senza questa logica, il cliente potrebbe scegliere uno slot
impossibile (es. 19:15 quando sono le 19:05 e l'ordine richiede 15
minuti). Vedi FEATURE_SPECS.md sezione 4.3.

La formula usata è: tempo_preparazione = MAX(tempi_singoli_piatti) +
(numero_piatti * 1 min di buffer). Lo slot è disponibile se:
- ora_corrente + tempo_preparazione <= ora_slot
- slot non ha già raggiunto la capacità massima (capacity = num_rider * slot_max_orders)
- il CAP del cliente è compatibile con i CAP già accettati nello slot
  (matrice distanze)

File toccati:
- packages/core/src/slots/calculator.ts (nuova logica principale)
- packages/core/src/slots/types.ts (tipi Slot, AvailableSlot, SlotCapacity)
- packages/core/tests/slots/calculator.test.ts (test unitari completi)
- apps/client/src/components/checkout/SlotPicker.tsx (UI aggiornata)

Test: 14 test unitari, copertura 95%. E2E test "checkout-slot-flow" passa.

Riferimenti: #23 (issue feature checkout)
```

**Esempio 2 — Fix commit:**

```
fix(cart): risolto bug calcolo totale con piatti a prezzo zero

Cosa fa: la funzione calculateTotal() ora gestisce correttamente
i piatti con prezzo 0€ (es. patatine omaggio aggiunte come bonus).

Perché: il bug causava NaN nel totale quando l'array conteneva
piatti senza prezzo definito. Scoperto durante test E2E.

File toccati:
- packages/core/src/cart/calculator.ts (added null check)
- packages/core/tests/cart/calculator.test.ts (added regression test)

Test: test "calcola totale con piatti omaggio" aggiunto.

Riferimenti: #45 (bug report)
```

**Esempio 3 — Chore commit:**

```
chore(setup): inizializzato progetto Next.js con TypeScript strict

Cosa fa: scaffold iniziale del progetto usando create-next-app
con configurazione App Router, TypeScript strict mode, Tailwind CSS.

Perché: punto di partenza del progetto come specificato in README.md
sezione 7 step 3.

File toccati:
- package.json (dipendenze base)
- tsconfig.json (strict: true, paths configurati)
- tailwind.config.ts (theme placeholder, da personalizzare in step UI)
- next.config.js (configurazione Vercel deploy ready)
- .env.example (template variabili)
- .gitignore (Next.js default + custom)

Test: build passa, dev server avvia su localhost:3000.

Riferimenti: README.md sezione 7
```

### 4.5 Esempi di commit fatti MALE

**Da non fare mai:**

```
fix bug                                    ❌ vago, no contesto
WIP                                        ❌ work in progress lasciato così
updated stuff                              ❌ inutilizzabile
asdfasdf                                   ❌ stupido
final fix                                  ❌ non c'è mai "final"
.                                          ❌ punto e basta
fix typo                                   ❌ ok ma manca scope e file
"feat: aggiunto qualcosa"                  ❌ scope mancante, descrizione vuota
```

### 4.6 Frequenza dei commit

**Commit piccoli e frequenti**, non commit giganti.

Linee guida:

- Massimo 200-300 righe di codice nuove per commit (eccetto file di migrazione DB)
- Un commit = una unità logica di lavoro
- Se stai lavorando su una feature grande, fai più commit progressivi
- Mai mischiare cambiamenti non correlati nello stesso commit (es. fix bug + nuova feature)

### 4.7 Quando fare commit

- Quando hai completato uno step logico (anche piccolo)
- Quando i test passano
- Prima di cambiare branch o task
- Alla fine della sessione di lavoro

Non aspettare di "completare la feature" per fare un commit. Spezzala.

---

## 5. Issue su GitHub (OBBLIGATORIE per ogni feature)

### 5.1 Quando aprire un'Issue

**Per ogni feature significativa** che stai per costruire, apri una Issue PRIMA di iniziare il codice. Usa il template `feature.md`.

**Per ogni bug** che trovi, apri una Issue. Usa il template `bug.md`.

**Per ogni decisione architetturale importante** che potrebbe avere alternative, apri una Issue di tipo "discussion" anche se è solo tu a discutere. Lascia tracciato il pensiero.

### 5.2 Template Feature Issue

```markdown
## Feature: <nome breve>

### Cosa

Descrizione della feature in 2-3 frasi.

### Perché

Motivazione: quale problema risolve, quale necessità del progetto.

### Come (piano di implementazione)

- [ ] Step 1: ...
- [ ] Step 2: ...
- [ ] Step 3: ...
- [ ] Test unitari
- [ ] Test E2E (se applicabile)
- [ ] Aggiornamento documentazione

### Riferimenti specifiche

Vedi `FEATURE_SPECS.md` sezione X.Y

### Decisioni di design

- Decisione 1: motivazione
- Decisione 2: alternative considerate e perché scartate

### Note per Stefano

Eventuali cose da segnalare, dubbi, aspetti da rivedere.
```

### 5.3 Template Bug Issue

```markdown
## Bug: <descrizione breve>

### Cosa accade

Descrizione del comportamento errato.

### Cosa dovrebbe accadere

Descrizione del comportamento corretto.

### Come riprodurre

1. Step 1
2. Step 2
3. Step 3
   Risultato: bug

### Ambiente

- Browser/dispositivo: ...
- Database state: ...
- User type: cliente / titolare / admin

### Severità

- 🔴 Critico (blocca uso app)
- 🟠 Alto (degrada esperienza)
- 🟡 Medio (workaround possibile)
- 🟢 Basso (estetico, minore)

### Causa

Analisi tecnica del problema.

### Soluzione

Descrizione della fix.
```

### 5.4 Weekly Report (OBBLIGATORIO ogni venerdì)

**Ogni venerdì sera, prima di chiudere il lavoro della settimana**, apri una Issue intitolata "Weekly Report — Settimana N" usando questo template:

```markdown
## Weekly Report — Settimana N (dal X al Y)

### 📊 Cosa è stato fatto

- Feature A completata (vedi #issue)
- Feature B al 60% (vedi #issue)
- Bug C risolto
- Refactor D

### 🚧 Cosa è in corso

- Feature B: rimanenti 40%, previsto completamento settimana N+1
- Esperimento su X (decisione pending)

### 🤔 Decisioni prese questa settimana

- Decisione 1: motivazione
- Decisione 2: motivazione

### ⚠️ Problemi e blocchi

- Problema 1: come è stato gestito o perché ancora aperto
- Nessun blocco critico al momento

### 📅 Piano settimana N+1

- Task 1
- Task 2
- Task 3

### 🔗 Link utili per Stefano

- Deploy staging: <URL>
- Branch attuale: dev / feature/xyz
- Commit più importanti della settimana: #abc, #def

### 📝 Note libere

Eventuali pensieri, considerazioni, suggerimenti.
```

Questo report è il **principale punto di contatto settimanale** tra te e Stefano. Curalo bene.

### 5.5 Labels da usare

Configura queste label su GitHub e applicale alle issue:

| Label                 | Colore           | Significato               |
| --------------------- | ---------------- | ------------------------- |
| `type: feature`       | verde            | Nuova funzionalità        |
| `type: bug`           | rosso            | Bug da risolvere          |
| `type: chore`         | grigio           | Setup, configurazione     |
| `type: refactor`      | giallo           | Ristrutturazione codice   |
| `type: docs`          | azzurro          | Documentazione            |
| `priority: critical`  | rosso scuro      | Blocca tutto              |
| `priority: high`      | arancio          | Importante                |
| `priority: medium`    | giallo           | Normale                   |
| `priority: low`       | verde chiaro     | Quando c'è tempo          |
| `area: client`        | viola            | App cliente               |
| `area: owner`         | blu              | App titolare              |
| `area: admin`         | indaco           | Pannello admin            |
| `area: db`            | nero             | Database                  |
| `area: infra`         | grigio scuro     | Infrastruttura            |
| `status: in-progress` | giallo brillante | In lavorazione            |
| `status: blocked`     | rosso            | Bloccato (raro)           |
| `status: review`      | viola chiaro     | Pronto per review Stefano |
| `weekly-report`       | celeste          | Report settimanale        |

---

## 6. File di tracciamento dello sviluppo

Oltre alle Issue, mantieni questi 4 file aggiornati nella cartella `/docs`.

### 6.1 PROGRESS.md (diario quotidiano)

Aggiorna ogni giorno di lavoro. Formato:

```markdown
# Progress Log

## 2026-05-15 (Lun)

**Sessione:** 14:00 - 18:00 (4h)
**Focus:** Setup iniziale progetto

### Fatto

- Inizializzato progetto Next.js (#1)
- Configurato Supabase project
- Creato schema base tabelle (#2)
- Primi 3 commit

### In sospeso

- Decisione su libreria stampante: webbluetooth API vs libreria terza

### Prossimo

- Implementare modello tenant
- Iniziare seeding dati

---

## 2026-05-16 (Mar — chiuso, no lavoro)

---

## 2026-05-17 (Mer)

**Sessione:** 19:00 - 22:00 (3h)
**Focus:** Modello multi-tenant
...
```

### 6.2 DECISIONS.md (registro decisioni architetturali)

Ogni volta che prendi una decisione importante, documentala qui:

```markdown
# Architecture Decision Records

## ADR-001: Uso di Drizzle invece di Prisma

**Data:** 2026-05-15
**Stato:** Adottato
**Decisore:** Claude Code

### Contesto

Serve un ORM per TypeScript + PostgreSQL. Le opzioni principali sono
Prisma e Drizzle.

### Decisione

Uso Drizzle ORM.

### Motivazioni

1. Più leggero (no generazione di client massicci)
2. Migliore integrazione con Supabase
3. Type-safety nativa senza compilation step
4. Migration più trasparenti (SQL diretto)

### Alternative considerate

- **Prisma**: più maturo, più documentato, ma generated client pesante
  e meno controllo su query complesse
- **TypeORM**: meno moderno, scelte di design discutibili
- **Kysely**: ottimo ma più verboso

### Implicazioni

- Tutti gli sviluppatori devono familiarizzare con Drizzle
- Migrazioni gestite via `drizzle-kit`
- Schema definito in `packages/database/schema.ts`

### Stefano può contestare questa decisione modificandola se preferisce.
```

Numera le ADR sequenzialmente (ADR-001, ADR-002, etc.). Mai eliminare ADR vecchie, semmai "deprecarle" con stato `Superseded by ADR-XYZ`.

### 6.3 KNOWN_ISSUES.md (debiti tecnici e bug noti)

Sii onesto. Annota tutto quello che sai non essere perfetto:

```markdown
# Known Issues & Technical Debt

## 🔴 Critici

_(nessuno al momento)_

## 🟠 Alti

### #45 - Performance del menu con molti piatti

Quando il menu ha più di 100 piatti, la lista lagga su mobile vecchi.
**Workaround attuale:** virtualizzazione liste con react-window
**Soluzione completa:** implementare lazy loading immagini + pagination

## 🟡 Medi

### #67 - Timezone hardcoded a Europe/Rome

Tutto il sistema assume timezone Europa/Roma. Non gestito multi-timezone.
**Quando affrontare:** quando si espande a ristoranti fuori Italia.

## 🟢 Bassi (cosmetic / nice to have)

### #89 - Animazione carrello potrebbe essere più fluida

Attualmente l'apertura del carrello è un fade-in basico. Si potrebbe
fare uno slide più moderno.
**Quando affrontare:** fase polish UI

## 📚 Debiti tecnici

- Nessun test per il modulo `/admin/settings` (rischio basso, settings statici)
- Variabili d'ambiente non validate centralmente (usare `zod` per schema env)
- Localizzazione date hardcoded in italiano (date-fns/it)
```

### 6.4 CHANGELOG.md (storico modifiche per versione)

Formato standard "Keep a Changelog":

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Sistema di feedback privato per la titolare

### Changed

- Refactor del calcolo slot per supportare timezone

### Fixed

- Bug calcolo totale con piatti omaggio

## [0.2.0] - 2026-07-15

### Added

- Storico ordini cliente (ultimi 10)
- Tasto "Riordina lo stesso"
- Sistema codici univoci per cliente

### Changed

- Migrazione da REST API a Server Actions per ordini

## [0.1.0] - 2026-06-30

### Added

- Setup iniziale progetto
- App cliente con menu navigabile
- Carrello base
- Selezione slot orari
```

---

## 7. Release e versioning

### 7.1 Versioning semantico

Usa **SemVer**: `MAJOR.MINOR.PATCH`

- `MAJOR` (0 → 1): break compatibilità, decide Stefano
- `MINOR` (0.1 → 0.2): nuove feature, decidi tu o Stefano
- `PATCH` (0.1.0 → 0.1.1): bug fix, decidi tu

Durante tutto lo sviluppo iniziale, resta in versione `0.x.y`. Solo al lancio pubblico passa a `1.0.0` (decisione di Stefano).

### 7.2 Quando rilasciare una versione

Crea un nuovo tag/release quando:

- Hai completato un set di feature significative
- Hai stabilizzato la versione (test passano, no bug critici)
- È un buon punto per fare "checkpoint" del progetto

**Frequenza tipica:** ogni 2-4 settimane durante lo sviluppo, più spesso vicino al lancio.

### 7.3 Come creare un release

1. Aggiorna `CHANGELOG.md` con tutte le modifiche dalla versione precedente
2. Aggiorna `version` in `package.json`
3. Commit: `chore(release): bump version to 0.2.0`
4. Crea tag: `git tag -a v0.2.0 -m "Release v0.2.0"`
5. Push tag: `git push origin v0.2.0`
6. Su GitHub, crea Release dalla pagina Tags
7. Nelle release notes, copia la sezione del changelog di quella versione

### 7.4 Naming dei tag

```
v0.1.0       ✓ corretto
v0.1.0-beta  ✓ pre-release
0.1.0        ❌ manca v
v0.1         ❌ manca patch
```

---

## 8. GitHub Actions (CI/CD)

### 8.1 Workflow base: `ci.yml`

Configura GitHub Actions per eseguire automaticamente:

```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - checkout code
      - setup Node 20
      - install dependencies (pnpm)
      - run lint (ESLint)
      - run typecheck (tsc --noEmit)
      - run unit tests (Vitest)
      - run E2E tests (Playwright) — opzionale, lento

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - checkout code
      - setup Node 20
      - install dependencies
      - build production
      - upload artifact
```

### 8.2 Deploy automatico su Vercel

Configura Vercel per deployare automaticamente:

- Ogni push su `dev` → deploy a `staging.wormhole-local.vercel.app` (URL preview)
- Ogni push su `main` → deploy a `wormhole-local.vercel.app` (produzione, attivabile solo al lancio)

Questo permette a Stefano di **aprire un link in qualsiasi momento** e vedere lo stato attuale dell'app.

### 8.3 Status badge nel README

Inserisci all'inizio del `README.md` pubblico del repo:

```markdown
[![CI](https://github.com/USER/wormhole-local/actions/workflows/ci.yml/badge.svg)](https://github.com/USER/wormhole-local/actions/workflows/ci.yml)
[![Deploy Status](https://api.vercel.com/badges/...)](...)
```

Stefano può vedere a colpo d'occhio se l'ultima build è verde.

---

## 9. Sicurezza: cose da NON committare

### 9.1 Mai committare

- File `.env.local`, `.env.production`
- Chiavi API (Stripe, Supabase service role key, etc.)
- Password
- Credenziali database
- Token GitHub
- File di configurazione utente
- File temporanei, log, cache
- Foto/asset binari grandi (>1MB) — usa Supabase Storage

### 9.2 `.gitignore` minimo

```
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
.next/
dist/
build/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Logs
*.log
npm-debug.log*

# Cache
.cache/
.turbo/

# Test
coverage/
playwright-report/
.playwright/

# OS
Thumbs.db
```

### 9.3 Se hai committato per sbaglio una chiave

1. **Subito**: ruota la chiave (revoca su Stripe/Supabase, genera nuova)
2. **Poi**: rimuovi dalla history con `git filter-branch` o `bfg-repo-cleaner`
3. **Apri Issue** per documentare l'incidente
4. **Aggiorna `KNOWN_ISSUES.md`** con riferimento

Anche se il repo è privato, considera una chiave esposta come compromessa.

---

## 10. Workflow giornaliero tipico

Per dare a Stefano un'idea di come dovrebbe essere una giornata di lavoro tipica:

### Mattina (o inizio sessione)

1. `git pull origin dev` per assicurarsi di essere aggiornato
2. Leggere ultima entry in `PROGRESS.md`
3. Decidere il task del giorno (da issue aperte o piano in PROGRESS.md)
4. Aprire/aggiornare Issue se necessario

### Durante il lavoro

1. Lavorare in piccoli increment
2. Test frequenti (`npm run test`)
3. Commit ogni step logico completato
4. Push frequenti su `dev`

### Fine sessione

1. Eseguire test completi
2. Verificare che il deploy staging funzioni
3. Aggiornare `PROGRESS.md` con quanto fatto
4. Aggiornare `KNOWN_ISSUES.md` se ci sono cose pending
5. Aggiornare `DECISIONS.md` se hai preso decisioni nuove
6. Commit finale di documentazione (`docs: aggiornato progress log`)

### Venerdì sera (settimanale)

1. Tutti i punti di "fine sessione"
2. **Creare Issue "Weekly Report — Settimana N"** con il template della sezione 5.4
3. Verificare deploy staging attivo
4. Verificare che `dev` sia in stato sano (test verdi)

---

## 11. Quando qualcosa va storto

### 11.1 Hai rotto qualcosa in `dev` e non riesci a fixare

1. **Non andare in panico**, è normale
2. Apri Issue di tipo bug, severità alta
3. Se la rottura è recente: `git revert <commit_sha>`
4. Se la rottura è vecchia: torna a un commit funzionante temporaneamente e fixa con calma
5. Documenta in `KNOWN_ISSUES.md`

### 11.2 Conflitto irrisolvibile con specifiche

Se trovi che le specifiche dicono A ma codificandolo realizzi che A è impossibile o sbagliato:

1. **Non ignorarlo**
2. Apri Issue dettagliata spiegando il problema
3. Proponi 2-3 alternative
4. Scegli quella che ti sembra più ragionevole
5. Documentala in `DECISIONS.md`
6. Continua il lavoro

Stefano la vedrà nel weekly report e potrà confermare o cambiare la rotta.

### 11.3 Non sai come fare qualcosa

Cerca nell'ordine:

1. Documentazione ufficiale della libreria/framework
2. Documentazione di progetto (`/docs`)
3. Esempi nel repo stesso
4. Stack Overflow / Discord communities
5. Per architettura: pensa "cosa farebbe un senior engineer?"

Non rimanere bloccato. Decidi e vai avanti. Documenta la decisione in `DECISIONS.md`.

---

## 12. Checklist primo setup

Quando Stefano dà il via al progetto, segui questa checklist:

### Setup repository

- [ ] Creato repository `wormhole-local` su GitHub (private)
- [ ] Configurato `.gitignore`
- [ ] Configurato `.nvmrc` con Node 20
- [ ] Creato `LICENSE` (MIT o decidere)
- [ ] Configurato branch `main` e `dev`
- [ ] Configurato branch protection su `main`
- [ ] Creato template Issue (`.github/ISSUE_TEMPLATE/`)
- [ ] Creato `ci.yml` per GitHub Actions
- [ ] Configurato Vercel per deploy automatico su push a `dev`

### Setup documentazione

- [ ] Copiato `README.md`, `GITHUB_SETUP.md`, `MASTER_SPEC.md`,
      `FEATURE_SPECS.md`, `DATABASE_SCHEMA.md` in `/docs`
- [ ] Creato `PROGRESS.md` vuoto (con prima entry "Setup iniziale")
- [ ] Creato `DECISIONS.md` vuoto
- [ ] Creato `KNOWN_ISSUES.md` vuoto
- [ ] Creato `CHANGELOG.md` con entry `## [Unreleased]`

### Setup tecnico

- [ ] Inizializzato Next.js 15+ con TypeScript strict
- [ ] Installato Tailwind CSS
- [ ] Installato shadcn/ui (init)
- [ ] Configurato pnpm workspaces (monorepo)
- [ ] Creato `apps/client`, `apps/owner`, `apps/admin`
- [ ] Creato `packages/database`, `packages/shared`, `packages/ui`, `packages/core`
- [ ] Configurato Supabase project (free tier)
- [ ] Configurato Drizzle ORM
- [ ] Configurato Vitest
- [ ] Configurato Playwright
- [ ] Configurato ESLint + Prettier

### Verifica iniziale

- [ ] `npm run dev` funziona su tutte e 3 le app
- [ ] `npm run test` passa (anche con zero test)
- [ ] `npm run build` produce build di produzione
- [ ] Deploy automatico Vercel funziona
- [ ] Tutti i 4 file di tracciamento esistono e sono aggiornati
- [ ] Primo commit fatto: `chore(setup): inizializzato progetto Wormhole Local`
- [ ] Apertura Issue "Weekly Report — Settimana 1" già pronto

---

**Versione documento**: 1.0
**Data**: Maggio 2026
**Autore**: Stefano Colombini (CEO)
**Status**: Approvato per inizio sviluppo
