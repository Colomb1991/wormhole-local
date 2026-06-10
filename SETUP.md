# Setup operativo — Cosa fare dopo aver scaricato lo zip

> Guida step-by-step per portare il monorepo dall'archivio scaricato al primo push su GitHub e al primo deploy su Vercel.

---

## 1. Scompatta e collega le credenziali

```bash
# Scompatta lo zip in una cartella di lavoro
# Su Windows: tasto destro → Estrai tutto
# Su Mac/Linux: unzip wormhole-local.zip
cd wormhole-local

# Sposta il tuo .env.local (quello con i 5 valori Supabase) nella root del progetto
# Deve trovarsi accanto a package.json
```

Verifica con `ls -la` (Mac/Linux) o `dir /a` (Windows) che `.env.local` esista nella root.

> **Una sola copia, nella root.** I `next.config.ts` delle tre app caricano
> `.env.local` dalla root del monorepo (con override): NON servono copie in
> `apps/client`, `apps/owner` o `apps/admin`. Se in passato hai copiato il file
> dentro un'app, puoi eliminare quella copia — e in ogni caso vince la root.
> In CI/Vercel il file non esiste e valgono le env del processo/progetto.

---

## 2. Installa le dipendenze (una volta sola, ~1 minuto)

```bash
pnpm install
```

Devi avere Node 20+ e pnpm 9+. Verifica con `node --version` e `pnpm --version`.

---

## 3. Verifica che tutto funzioni in locale

```bash
pnpm test         # 49 test devono passare
pnpm typecheck    # nessun errore TypeScript
pnpm lint         # nessun warning
```

Se uno di questi fallisce: **non procedere oltre**, apri una Issue sul repo (dopo averlo creato al punto 5) e segnalami il problema.

---

## 4. Applica lo schema al database Supabase

```bash
# Genera la prima migrazione SQL dallo schema Drizzle
pnpm db:generate

# Applica al DB remoto (usa DIRECT_URL dal .env.local)
pnpm db:push

# Popola con il tenant placeholder e dati di esempio
pnpm db:seed
```

Quando finisce, vai su Supabase Dashboard → Table Editor: dovresti vedere le 18 tabelle.

> Se `db:push` chiede conferma per qualche operazione "destructive", rispondi `No` e mandami il prompt — non dovrebbe accadere al primo push.

---

## 5. Push iniziale su GitHub

```bash
git init
git branch -M main
git add .
git commit -m "chore(setup): inizializzato progetto Wormhole Local

Cosa fa: scaffolding iniziale completo del monorepo pnpm con
3 app Next.js, 4 package condivisi, schema Drizzle delle 18 tabelle,
core logic con 49 test, CI workflow, documentazione.

Vedi docs/PROGRESS.md per il dettaglio."

git remote add origin https://github.com/Colomb1991/wormhole-local.git
git push -u origin main

# Crea anche il branch dev (dove avverrà tutto lo sviluppo)
git checkout -b dev
git push -u origin dev
```

Dopo il push, GitHub Actions parte da solo. Controlla la tab **Actions** del repo: deve diventare verde in ~2 minuti.

---

## 6. Configurazioni manuali su GitHub (5 min)

Cose che non si possono scriptare e vanno fatte una volta:

### Branch protection su `main`
- Repo → Settings → Branches → Add rule
- Branch name pattern: `main`
- ✅ Require status checks to pass before merging
- Salva

### Labels
Vai su Issues → Labels → New label e crea queste (oppure usa `gh label create` se hai la GitHub CLI):

| Label | Colore |
|-------|--------|
| `type: feature` | `#0e8a16` verde |
| `type: bug` | `#d73a4a` rosso |
| `type: chore` | `#cccccc` grigio |
| `type: refactor` | `#fbca04` giallo |
| `type: docs` | `#0075ca` azzurro |
| `priority: critical` | `#b60205` rosso scuro |
| `priority: high` | `#d93f0b` arancio |
| `priority: medium` | `#fbca04` giallo |
| `priority: low` | `#c2e0c6` verde chiaro |
| `area: client` | `#7057ff` viola |
| `area: owner` | `#1d76db` blu |
| `area: admin` | `#5319e7` indaco |
| `area: db` | `#000000` nero |
| `area: infra` | `#666666` grigio scuro |
| `status: in-progress` | `#fef2c0` giallo brillante |
| `status: blocked` | `#e11d21` rosso |
| `status: review` | `#d4c5f9` viola chiaro |
| `weekly-report` | `#bfd4f2` celeste |

---

## 7. Deploy su Vercel (3 progetti separati)

Vercel su Hobby plan permette deploy gratuiti di N progetti dallo stesso repo. Facciamo un progetto Vercel per ogni app.

### App cliente (`apps/client`)

1. Vai su vercel.com → Add New → Project
2. Import `wormhole-local` dal tuo GitHub
3. Project name: `wormhole-local-client`
4. **Framework Preset**: Next.js (auto-detected)
5. **Root Directory**: clicca Edit → seleziona `apps/client`
6. **Build Settings**: lascia default
7. **Environment Variables**: incolla tutte le variabili del tuo `.env.local`. Quelle critiche:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET`
   - `NEXT_PUBLIC_APP_URL` → metti l'URL Vercel che ti viene assegnato (puoi prima fare il deploy con un placeholder e poi correggerlo)
   - `NEXT_PUBLIC_STRIPE_ENABLED=false`
   - `NEXT_PUBLIC_FEEDBACK_ENABLED=true`
8. Deploy

### App titolare (`apps/owner`)

Ripeti i passi 1-8 con Root Directory = `apps/owner`, project name `wormhole-local-owner`.

### Pannello admin (`apps/admin`)

Ripeti i passi 1-8 con Root Directory = `apps/admin`, project name `wormhole-local-admin`.

### Branch deployment

Per default, Vercel deploya solo il branch `main` come "production". Per avere deploy automatici anche da `dev`:

- Settings → Git → **Production Branch**: lascia `main`
- I push su `dev` finiranno automaticamente in preview URL come `wormhole-local-client-git-dev-<...>.vercel.app`

---

## 8. Crea il primo Weekly Report

Venerdì sera, apri una Issue dal template "Weekly Report":
- Title: `Weekly Report — Settimana 1 (dal 2026-06-08 al 2026-06-12)`
- Compila con quanto è stato fatto

---

## 9. Cose ancora da fare prima del lancio (non bloccanti per dev)

Vedi `docs/KNOWN_ISSUES.md` sezione "Debiti tecnici":

- **DT-001**: rimpiazzare i dati placeholder del tenant quando hai i dati reali dalla titolare
- **DT-002**: lanciare `pnpm build:distance-matrix cinese-usdt` per geocodificare via Nominatim
- **DT-003**: generare VAPID keys con `npx web-push generate-vapid-keys` (richieste quando implementerai le notifiche push)

---

## Comandi utili durante lo sviluppo

```bash
# Avvia tutte e 3 le app in parallelo (richiede 3 terminali aperti, usa porte 3000/3001/3002)
pnpm dev

# Oppure singolarmente
pnpm dev:client   # http://localhost:3000
pnpm dev:owner    # http://localhost:3001
pnpm dev:admin    # http://localhost:3002

# Drizzle Studio (DB browser visuale)
pnpm db:studio

# Aggiorna schema dopo modifiche
pnpm db:generate && pnpm db:push

# Test in watch mode
pnpm test:watch
```

---

## Se qualcosa non va

Per ogni problema:
1. Controlla `docs/KNOWN_ISSUES.md`
2. Cerca tra le Issue chiuse su GitHub
3. Apri una nuova Issue usando il template bug
4. In una nuova chat con me, dammi: link Issue, output del comando che è fallito, eventuali screenshot

Buona fortuna 🚀
