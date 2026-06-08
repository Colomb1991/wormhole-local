# Wormhole Local — Project README

> **Documento principale del progetto Wormhole Local v0.**
> Questo è il primo file che ogni nuova sessione di sviluppo deve leggere.

---

## 1. Cosa stai costruendo

Stai costruendo **Wormhole Local**, un'app di food delivery dedicata a un singolo ristorante asiatico-cinese di Livorno (Corso Mazzini 341, CAP 57126). L'app è la versione 0 di un progetto più grande chiamato Wormhole.

### Architettura concettuale

L'app è composta da **3 interfacce utente** che condividono lo stesso backend:

1. **App Cliente** — Progressive Web App (PWA) per chi ordina cibo
2. **App Titolare** — App mobile (PWA) che usa la titolare del ristorante per ricevere e gestire ordini
3. **Pannello Admin** — Web app per la gestione menu, configurazioni, statistiche (usata sia dalla titolare in versione semplificata, sia da Stefano per la gestione globale)

### Cosa NON è incluso nella v0

- Sistema di pagamento online attivo (Stripe è predisposto ma disattivato)
- App nativa per i rider (i rider ricevono comande stampate dalla titolare)
- Marketplace multi-ristorante (architettura multi-tenant pronta, ma al lancio c'è solo un ristorante)
- Sistema crypto, blockchain, token $WARP (quelli arriveranno in Wormhole vera, non in Wormhole Local)
- Recensioni pubbliche (solo feedback privato per la titolare)
- Personalizzazione piatti (es. "senza cipolla")

---

## 2. Chi è il founder

Il progetto è di **Stefano Colombini**, founder e CEO. Vive a Livorno, fa il corriere Amazon, ha competenze tecniche solide ma non è uno sviluppatore full-time. Per questo motivo lo sviluppo viene affidato a Claude Code in autonomia.

### Come Stefano lavora con te (Claude Code)

- Stefano ti dà il via, **tu lavori in autonomia**
- Stefano **osserva GitHub** giorno per giorno
- Stefano **prova l'app ogni 2 settimane circa** sull'ambiente di staging
- Stefano interviene con **fix mirati** quando vede cose da correggere
- Tu **non chiedi mai conferma** prima di agire, ma **documenti tutto** in modo che Stefano possa rivedere ogni decisione

---

## 3. Il ristorante pilota

### Informazioni base

- **Indirizzo**: Corso Mazzini 341, 57126 Livorno, Italia
- **Tipo**: Ristorante asiatico/cinese
- **Telefono**: (da inserire al setup configurazione)
- **Modalità attuale**: ordini telefonici diretti, niente piattaforme terze

### Operatività

- **Giorni di apertura**: Lunedì, Mercoledì, Giovedì, Venerdì, Sabato, Domenica
- **Giorno di chiusura settimanale**: Martedì
- **Orario di consegna**: 19:00 — 22:00
- **Soglia minima ordine**: 10€

### Rider

- **Lun-Gio**: 1 rider attivo
- **Ven-Dom**: 2 rider attivi
- I rider sono dipendenti del ristorante, pagati direttamente dalla titolare con i soldi della consegna
- I rider non hanno un'app dedicata: ricevono la comanda cartacea dalla stampante termica

### Pagamenti

- **Pagamento alla consegna**: contanti o POS portatile (se ne ha uno)
- **Resto massimo gestito**: 50€ (regola operativa esistente)
- **Stripe**: predisposto nel codice ma disattivato via feature flag

### Tariffe consegna (placeholder, da confermare con titolare)

Le tariffe definitive verranno decise da Stefano insieme alla titolare. Per ora usa questi placeholder:

- CAP vicini al ristorante: 2,00€
- CAP medi: 2,50€
- CAP lontani ma serviti: 3,00€
- CAP molto lontani: 3,50€

---

## 4. Stack tecnologico obbligatorio

**NON cambiare lo stack senza approvazione esplicita di Stefano.**

### Frontend

- **Framework**: Next.js 15+ (App Router)
- **Linguaggio**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4+
- **Component library**: shadcn/ui (componenti accessibili e personalizzabili)
- **State management**: Zustand per stato globale, React Query/TanStack Query per dati server
- **Form**: React Hook Form + Zod per validazione
- **Icone**: Lucide React

### Backend

- **Runtime**: Node.js 20+ (server actions di Next.js dove possibile)
- **Linguaggio**: TypeScript
- **Database**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM (più leggero di Prisma, ottimo per Supabase)
- **Auth**: Supabase Auth (per app titolare e admin)
- **Storage**: Supabase Storage per foto piatti

### Infrastruttura

- **Hosting frontend**: Vercel (piano Hobby gratuito durante sviluppo)
- **Hosting database**: Supabase (piano Free durante sviluppo)
- **CDN**: Cloudflare se necessario (gratis)
- **Notifiche push**: Web Push API native (PWA) — gratis
- **Email**: Resend (piano gratuito fino a 3.000 email/mese)
- **Geocoding (per matrice distanze CAP)**: OpenStreetMap Nominatim (gratis)

### Pagamenti (predisposto ma disattivato)

- **Stripe Connect**: integrazione presente nel codice, attivabile via feature flag

### Test

- **Unit**: Vitest
- **E2E**: Playwright (test critici dell'happy path)
- **Linting**: ESLint + Prettier

### Hardware integrato

- **Stampante termica**: Star Micronics o Epson via Web Bluetooth API (linguaggio ESC/POS)

---

## 5. Vincoli operativi importanti

### COSTI ZERO durante sviluppo

Stefano **non spenderà soldi** durante la fase di sviluppo. Tutto deve girare su piani gratuiti:

- Vercel Hobby (gratis)
- Supabase Free (gratis)
- Resend Free tier (gratis)
- Domini provvisori `.vercel.app` (gratis)

Quando si arriverà al lancio reale (mese 5-7), Stefano valuterà l'upgrade ai piani Pro. **Tu non fare upgrade automatici.**

### Multi-tenant ready dal Day 1

Il database e l'architettura devono essere multi-tenant fin dalla prima riga di codice. Anche se al lancio c'è UN solo ristorante, ogni query deve filtrare per `tenant_id` (o `restaurant_id`). Vedi `MASTER_SPEC.md` per dettagli.

### Lingua: solo italiano

L'app è esclusivamente in italiano. Niente i18n complicato. Stringhe italiane direttamente nel codice o in un file centrale.

### Privacy first

Salviamo i dati personali strettamente necessari. Vedi `MASTER_SPEC.md` per il dettaglio GDPR.

### Documentazione obbligatoria

Ogni decisione, ogni feature, ogni commit deve essere documentato. Vedi `GITHUB_SETUP.md` per le regole.

---

## 6. Documenti del progetto

Questo è il primo documento che leggi. Gli altri documenti sono:

| Documento            | Contenuto                                           | Quando consultarlo                     |
| -------------------- | --------------------------------------------------- | -------------------------------------- |
| `README.md`          | Questo file                                         | Sempre, all'inizio di ogni sessione    |
| `GITHUB_SETUP.md`    | Convenzioni Git, branch, commit, documentazione     | Prima di fare il primo commit          |
| `MASTER_SPEC.md`     | Architettura completa, stack, decisioni di prodotto | Per ogni decisione architetturale      |
| `FEATURE_SPECS.md`   | Specifiche dettagliate di ogni feature              | Quando lavori su una feature specifica |
| `DATABASE_SCHEMA.md` | Modello dati completo con tutte le tabelle          | Per query, migrazioni, modelli dati    |

Inoltre, durante lo sviluppo tu creerai e manterrai questi file:

| File              | Contenuto                                     | Aggiornamento             |
| ----------------- | --------------------------------------------- | ------------------------- |
| `PROGRESS.md`     | Diario di sviluppo giornaliero                | Ogni giorno di lavoro     |
| `DECISIONS.md`    | Registro decisioni architetturali fatte da te | Ogni decisione importante |
| `KNOWN_ISSUES.md` | Bug noti, debiti tecnici, cose da migliorare  | Continuativamente         |
| `CHANGELOG.md`    | Storico modifiche per versione                | Ad ogni release o tag     |

---

## 7. Come iniziare (primo giorno di sviluppo)

Quando Stefano ti darà il via, segui esattamente questa sequenza:

### Step 1: Lettura completa (1 sessione)

Leggi nell'ordine, completamente:

1. Questo file (`README.md`)
2. `GITHUB_SETUP.md`
3. `MASTER_SPEC.md`
4. `DATABASE_SCHEMA.md`
5. `FEATURE_SPECS.md`

Non iniziare a scrivere codice prima di aver letto tutto.

### Step 2: Setup repository

Segui le istruzioni in `GITHUB_SETUP.md` per:

1. Inizializzare il repository
2. Creare i file di tracciamento (`PROGRESS.md`, `DECISIONS.md`, etc.)
3. Configurare branch e protezioni
4. Fare il primo commit "chore: initial project structure"

### Step 3: Setup tecnico

1. Inizializza progetto Next.js con `create-next-app`
2. Configura TypeScript strict mode
3. Configura ESLint e Prettier
4. Installa Tailwind CSS
5. Installa shadcn/ui
6. Configura connessione a Supabase (con account gratuito che Stefano ti darà)
7. Configura Drizzle ORM
8. Configura testing con Vitest e Playwright
9. Configura deploy automatico su Vercel

Ad ogni step, fai un commit separato. Vedi `GITHUB_SETUP.md` per il formato.

### Step 4: Database schema

Crea le tabelle del database secondo `DATABASE_SCHEMA.md`. Genera la migrazione iniziale con Drizzle.

### Step 5: Seed data

Crea dati di test (un ristorante "Cinese USDT", qualche piatto fittizio con tempi di preparazione, qualche CAP con tariffe).

### Step 6: Inizia a costruire feature

Da qui in poi segui `FEATURE_SPECS.md` in ordine:

1. Setup multi-tenant
2. Menu navigabile
3. Carrello
4. Calcolo slot orari
5. Codice consegna cliente
6. Checkout (con flag pagamento alla consegna / online)
7. App titolare (accettazione ordini, stampa comanda)
8. Dashboard admin (gestione menu, CAP, configurazioni)
9. Sistema notifiche
10. Feedback privato
11. Storico ordini cliente + riordina

---

## 8. Filosofia di sviluppo

### Build for change

Stefano apporterà fix e modifiche dopo il primo grande build. **Scrivi codice come se qualcun altro dovesse modificarlo dopo di te.** Pulito, documentato, modulare.

### Test-driven dove serve

Scrivi test per:

- Logica di calcolo (slot orari, tariffe consegna, codice cliente, validazione carrello)
- API endpoints critici
- Flusso ordine end-to-end (E2E)

Non scrivere test esagerati per UI banali.

### Mobile first, ma desktop usabile

L'app cliente sarà usata principalmente da mobile. L'app titolare sarà usata da mobile (telefono della titolare). Il pannello admin va sia desktop che mobile, ma può privilegiare desktop.

### Performance matter

- Il menu deve caricare in meno di 2 secondi su 3G
- L'app deve funzionare anche con connessione instabile (gestione errori di rete)
- Immagini ottimizzate con Next.js Image component

### Sicurezza

- Mai esporre chiavi API nel client
- Tutte le scritture al database passano per server actions o API routes
- Row-level security su Supabase per multi-tenancy
- Sanitizzazione input utente
- Rate limiting su endpoint critici (login, ordini)

---

## 9. Cosa fare quando incontri ambiguità

Durante lo sviluppo, troverai sicuramente situazioni non coperte dalle specifiche. In questi casi:

### 1. Cerca prima nei documenti

Forse la risposta c'è in `MASTER_SPEC.md` o `FEATURE_SPECS.md` ma in una sezione diversa da dove stai cercando.

### 2. Applica il principio "what would Stefano want?"

Stefano vuole:

- **Semplicità** sopra eleganza tecnica
- **Funzionalità che servono al ristorante** (non feature inutili)
- **Esperienza utente fluida** (poche frizioni)
- **Codice modificabile facilmente** (per fix futuri)

### 3. Decidi e documenta in `DECISIONS.md`

Prendi una decisione ragionevole, documentala con motivazione. Stefano la rivedrà e se non gli piace, la cambieremo.

### 4. NON bloccare il lavoro

**Non aspettare risposte.** Vai avanti. La velocità è importante. Le decisioni si possono sempre rivedere dopo.

---

## 10. Roadmap di alto livello

### Fase 1 — Foundation (Settimana 1-2)

Setup tecnico, repository, ambienti, database schema, seed data.

### Fase 2 — Core ordering flow (Settimana 3-6)

Menu, carrello, slot orari, checkout, codice cliente, modelli dati ordini.

### Fase 3 — Titolare (Settimana 7-9)

App titolare: notifiche, accettazione, gestione ordini, stampa comanda termica.

### Fase 4 — Admin & gestione (Settimana 10-12)

Pannello admin, gestione menu, gestione CAP, configurazioni ristorante, feedback.

### Fase 5 — Polish & testing (Settimana 13-16)

Testing end-to-end, fix bug, ottimizzazione performance, UI/UX refinement.

### Fase 6 — Beta launch interno (Settimana 17-18)

Deploy in produzione, beta test con amici e parenti del ristorante, fix critici.

### Fase 7 — Lancio pubblico (Settimana 19-22)

Pubblicazione PWA, volantinaggio, monitoring, supporto.

**Stima totale: 5-6 mesi** con uno sviluppatore part-time + Claude Code in autonomia.

---

## 11. Contatti e supporto

- **Stefano Colombini** — Founder & CEO — founder@wormholenetwork.io
- **Repository GitHub**: (URL da configurare al setup)
- **Ambiente staging**: (URL Vercel da configurare al setup)
- **Ambiente produzione**: (URL definitivo da configurare al lancio)

---

## 12. Glossario rapido

| Termine              | Significato                                                                  |
| -------------------- | ---------------------------------------------------------------------------- |
| **Wormhole Local**   | Nome di questa app v0                                                        |
| **Wormhole**         | Progetto madre che includerà delivery + Nerd Haven + Studios in futuro       |
| **Tenant**           | Singolo ristorante nell'app multi-tenant                                     |
| **Titolare**         | La proprietaria/gestore del ristorante (in v0: la signora cinese)            |
| **Slot di consegna** | Finestra di tempo (es. 19:30) in cui il cliente può ricevere l'ordine        |
| **Codice cliente**   | 4 cifre univoche fisse per ogni cliente, usate dal rider alla consegna       |
| **PWA**              | Progressive Web App, app che gira nel browser ma si comporta come app nativa |
| **CAP**              | Codice di Avviamento Postale, usato per zone di consegna                     |
| **GMV**              | Gross Merchandise Volume, fatturato totale degli ordini                      |

---

**Versione documento**: 1.0
**Data**: Maggio 2026
**Autore**: Stefano Colombini (CEO)
**Approvato per inizio sviluppo**: Sì
