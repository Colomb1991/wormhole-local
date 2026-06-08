# Architecture Decision Records

Registro delle decisioni architetturali prese durante lo sviluppo.

Format: contesto, decisione, motivazioni, alternative, implicazioni.
Numerate sequenzialmente. Mai eliminare una ADR, semmai marcarla "Superseded".

---

## ADR-001: Workflow di sviluppo con AI

**Data:** 2026-06-08
**Stato:** Adottato
**Decisore:** Stefano Colombini

### Contesto

I documenti spec sono scritti pensando a un agente "Claude Code" che lavora in
autonomia sul repo (push commit giornalieri, deploy automatico). Lo scaffolding
iniziale è stato però generato da **Claude in interfaccia web (claude.ai)**,
che ha limitazioni diverse: nessun accesso al filesystem locale di Stefano,
nessuna possibilità di pushare direttamente su GitHub, nessuna persistenza
tra sessioni.

### Decisione

Workflow ibrido:

1. **Claude web (claude.ai)** usato per: pianificazione, generazione di
   blocchi di scaffolding grandi e auto-contenuti, decisioni architetturali,
   revisione codice. Output: file .zip che Stefano scarica e pusha.
2. **Claude Code (locale, opzionale)** usato in futuro per: lavoro autonomo
   continuativo, push giornalieri, esecuzione di test e migration contro DB
   reale. Da valutare quando Stefano è pronto a installarlo.
3. **Stefano** resta in controllo di: account GitHub/Supabase/Vercel, push
   effettivi, deploy, revisione weekly report.

### Motivazioni

- Riduce la friction iniziale: nessun setup di Claude Code necessario per
  partire.
- Rispetta i vincoli reali della sessione Claude web (no credenziali, no
  persistenza, no push remoto).
- Mantiene aperta l'opzione Claude Code locale se Stefano la sceglie più
  avanti.

### Alternative considerate

- **Solo Claude Code dal day 1**: richiede setup iniziale più lungo. Scartata
  per non bloccare l'inizio dello sviluppo.
- **Solo Claude web manuale**: ogni feature richiederebbe a Stefano di
  scaricare/copiare/incollare. Scartata come unica opzione, ma resta
  utilizzabile in parallelo.

### Implicazioni

- I weekly report e PROGRESS.md vengono aggiornati manualmente da Stefano
  (o tramite Claude web in chat dedicata) finché Claude Code non è attivo.
- Le issue su GitHub vengono aperte manualmente o tramite il workflow
  scelto.

### Aggiornamento 2026-06-08 — workflow operativo "in tandem" attivo

Dalla prima sessione di setup, **Claude Code locale è attivo** e il workflow
ibrido previsto sopra si è concretizzato in un modello "in tandem" a due agenti
AI, con Stefano come ponte e arbitro:

| Attore | Ruolo | Cosa NON può fare |
| ------ | ----- | ----------------- |
| **Claude Code** (locale, questo agente) | **Esecutore sul repo**: legge/scrive file, esegue comandi (pnpm, git, drizzle), applica modifiche, scrive i report. | Non decide da solo la strategia; non ha memoria tra sessioni. |
| **Claude Opus 4.8** (interfaccia web) | **Consulente di pianificazione**: ragiona sulla strategia, genera i prompt operativi per Claude Code, rivede gli output. | Nessun accesso a filesystem/repo/credenziali; non esegue comandi; non ha memoria tra sessioni. |
| **Stefano** | **Ponte e arbitro**: incolla gli output di Claude Code nella chat web, riporta i prompt generati a Claude Code, dà le conferme sui passi sensibili (es. scritture sul DB reale). | — |

**Flusso tipico di un giro:**

1. Claude Code produce un output (es. esito di un comando, un report).
2. Stefano lo incolla nella chat di Claude Opus web.
3. Claude Opus ragiona e genera un prompt operativo.
4. Stefano incolla quel prompt a Claude Code, che esegue.

**Conseguenza fondamentale — la fonte di verità è SEMPRE il repo.** Nessuno dei
due agenti AI ha memoria persistente: a ogni sessione si riparte leggendo i file
del repo. Quindi:

- `docs/PROGRESS.md` resta il **diario sintetico** giornaliero.
- `docs/sessions/*.md` contiene un **report dettagliato per ogni sessione**
  (vedi `docs/sessions/README.md`), scritto per essere comprensibile da un altro
  Claude che non sa nulla della sessione.
- `docs/DECISIONS.md` (questo file) traccia le decisioni architetturali.
- Ogni report va scritto pensando: *"lo leggerà un altro Claude a freddo"*.

Questo aggiornamento integra (non sostituisce) la decisione originale di ADR-001:
l'opzione "Claude Code locale" lì lasciata aperta è ora quella adottata.

---

## ADR-002: Stack tecnico vincolato

**Data:** 2026-06-08
**Stato:** Adottato
**Decisore:** Stefano Colombini (definito in MASTER_SPEC.md)

### Contesto

Lo stack è esplicitamente vincolato in `docs/MASTER_SPEC.md` sezione 2. Non
ridiscusso, registrato qui per riferimento.

### Decisione

Stack obbligatorio: Next.js 15 + TypeScript strict + Tailwind 4 + shadcn/ui +
Drizzle + Supabase + Vercel + Vitest + Playwright. Nessuna deviazione senza
approvazione esplicita.

### Implicazioni

Cambi di stack richiedono nuova ADR che sostituisca questa.

---

## ADR-003: Prezzi in centesimi (integer)

**Data:** 2026-06-08
**Stato:** Adottato
**Decisore:** definito in MASTER_SPEC.md sez. 6.2

### Contesto

I prezzi possono essere rappresentati come `decimal(10,2)` o come `integer`
(centesimi). Floating point ha problemi noti di arrotondamento.

### Decisione

Tutti gli importi monetari sono `integer` (centesimi) nel database, in API,
nel core logic. Conversione a euro solo per display all'utente.

### Motivazioni

- Elimina errori `0.1 + 0.2 = 0.30000000000000004`.
- Confronti di uguaglianza sono safe.
- Convenzione comune in Stripe, PayPal e tutti i sistemi di pagamento.

### Implicazioni

- Schema Drizzle: colonne `priceCents`, `subtotalCents`, `totalCents`,
  `deliveryFeeCents`, etc.
- Utility `formatCurrency(cents)` in `packages/shared/src/utils/formatters.ts`
  per il display.

---

## ADR-004: Connection pooling Supabase (Transaction + Direct)

**Data:** 2026-06-08
**Stato:** Adottato
**Decisore:** Claude (scaffolding)

### Contesto

Supabase espone tre modi di connettersi al Postgres:

1. **Direct** (porta 5432, IPv6-only di default) — connessione diretta.
2. **Transaction pooler** (porta 6543, IPv4-compatible) — pgbouncer in
   transaction mode.
3. **Session pooler** (porta 5432 pooler host, IPv4-compatible) — pgbouncer
   in session mode.

Vercel serverless non garantisce IPv6 e crea molte connessioni brevi.

### Decisione

Usiamo **due connection string**:

- `DATABASE_URL` = transaction pooler (6543) per l'app runtime
- `DIRECT_URL` = session pooler (5432) per Drizzle Kit (migrazioni)

### Motivazioni

- Transaction pooler è IPv4-compatibile e ottimizzato per serverless.
- Drizzle Kit richiede una sessione persistente per `LISTEN/NOTIFY` e advisory
  locks durante le migrazioni — il session pooler la supporta.
- Pattern standard documentato da Supabase per Vercel + Prisma/Drizzle.

### Alternative considerate

- **Solo direct (IPv6)**: non funziona su molte reti residenziali italiane
  né su tutti i provider Vercel edge.
- **Solo transaction pooler**: rompe le migrazioni Drizzle Kit (prepared
  statements non supportate in transaction mode).

### Implicazioni

- `.env.example` documenta entrambe le variabili.
- `packages/database/drizzle.config.ts` usa `DIRECT_URL`.
- `packages/database/src/client.ts` usa `DATABASE_URL`.
