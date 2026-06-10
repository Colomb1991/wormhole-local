# Known Issues & Technical Debt

Bug noti, debiti tecnici, cose da migliorare. Aggiornato continuativamente.

Severità:

- 🔴 Critici — blocca l'uso dell'app
- 🟠 Alti — degrada esperienza utente
- 🟡 Medi — workaround possibile
- 🟢 Bassi — estetico/nice-to-have
- 📚 Debiti tecnici — non bug ma da migliorare

---

## 🔴 Critici

_(nessuno al momento)_

---

## 🟠 Alti

_(nessuno al momento)_

---

## 🟡 Medi

_(nessuno al momento)_

---

## 🟢 Bassi

_(nessuno al momento)_

---

## ✅ Risolti

### RIS-002 — Password DB Supabase esposta negli output → ruotata

**Sessione:** 2026-06-08 (vedi `docs/sessions/2026-06-08-setup-iniziale.md`)
**Severità originale:** 🔴 Critico (era SEC-001).

Durante i tentativi falliti di `db:push`, la connection string con la password
reale del DB Supabase era comparsa **in chiaro** negli output di errore (la URL
veniva stampata dal driver `postgres`), restando nel transcript della sessione.

**Risolto il 2026-06-08:** Stefano ha eseguito **Reset database password** su
Supabase e aggiornato `DATABASE_URL` e `DIRECT_URL` in `.env.local`. La
connessione è stata verificata con una query di lettura su entrambi gli endpoint
(session pooler 5432 e transaction pooler 6543): **entrambe OK**. La vecchia
password (compromessa) non è più valida.

**Lezione appresa:** non stampare mai connection string complete negli output.
Le due variabili devono contenere la **stessa** password; preferire password
**alfanumeriche** per evitare problemi di URL-encoding (un `%` non codificato
rompe `decodeURIComponent` nel driver `postgres`).

**Da non dimenticare:** aggiornare la password anche nelle env vars di **Vercel**
quando si configurano i progetti (passo 7).

### RIS-001 — Import relativi con estensione `.js` rompevano drizzle-kit

**Sessione:** 2026-06-08 (vedi `docs/sessions/2026-06-08-setup-iniziale.md`)
**Severità originale:** 🔴 Critico (bloccava `db:generate`/`db:push`/`db:migrate`/`db:seed`)

**Sintomo:** `pnpm db:generate` falliva con
`Error: Cannot find module './tenants.js'`.

**Causa:** tutti i package interni (`database`, `core`, `shared`, `ui`) e i due
script (`seed.ts`, `distances-matrix.ts`) usavano import/export relativi con
estensione esplicita `.js` (convenzione NodeNext), ma sul disco esistono solo
file `.ts`. Il progetto usa `moduleResolution: "bundler"` (root `tsconfig.json`),
quindi `tsc` e Vitest tolleravano la cosa (typecheck e test passavano), ma il
loader CommonJS di `drizzle-kit` 0.28.1 cercava letteralmente i `.js` e
crashava. Per questo la migrazione iniziale non era mai stata prodotta nonostante
PROGRESS.md la dichiarasse fatta.

**Fix:** rimosse le estensioni `.js` da tutti gli import/export **relativi**
(57 occorrenze in 27 file). Import da `@wormhole/*`, `drizzle-orm/*`, `node:*`
lasciati intatti. Forma idiomatica per `moduleResolution: "bundler"`. Dopo il
fix: 49 test verdi, typecheck e lint puliti, `db:generate` produce
`migrations/0000_mean_skin.sql`.

**Prevenzione futura:** non usare estensioni `.js` negli import relativi finché
la `moduleResolution` resta `bundler`. Se in futuro si passa a NodeNext, ripristinarle
in modo coerente su tutto il monorepo e verificare drizzle-kit.

---

## 📚 Debiti tecnici noti dal setup

### DT-001 — Placeholder ristorante da sostituire

Il seed iniziale crea un tenant `cinese-usdt` con dati placeholder:

- Nome: "Ristorante Cinese USDT"
- Phone: `+39000000000`
- Email: `placeholder@example.com`
- Logo URL: `null`
- Brand color: `#00A893` (verde Wormhole default)
- 7 CAP serviti con tariffe placeholder (2.00-3.50€)
- Menu: 8 piatti di esempio finti

**Quando affrontare:** quando Stefano ha i dati reali della titolare. Cambiare
via pannello admin o via script di update dedicato.

### DT-002 — Coordinate ristorante mancanti

Il ristorante è a `Corso Mazzini 341, 57126 Livorno`. Le coordinate
lat/lng nel seed sono settate a un valore approssimato della zona. Vanno
geocodificate con precisione tramite Nominatim al primo run di
`scripts/distances-matrix.ts`.

**Quando affrontare:** prima del primo calcolo distanze.

### DT-003 — VAPID keys da generare

Le chiavi VAPID per Web Push non sono incluse nel repo (sono segrete). Vanno
generate una volta con `npx web-push generate-vapid-keys` e messe in
`.env.local` + nelle env di Vercel.

**Quando affrontare:** prima di implementare il sistema di notifiche push
(feature spec sezione 11).

### DT-004 — Branch protection non configurata

`main` deve essere protetto: push diretto bloccato, richiede CI verde. Questa
configurazione si fa via Web UI GitHub e non è scriptabile nel repo. Da fare
manualmente.

**Quando affrontare:** dopo il primo push, quando il branch `main` esiste.

### DT-005 — Label GitHub non configurate

Le label `type:*`, `priority:*`, `area:*`, `status:*` definite in
`docs/GITHUB_SETUP.md` sez. 5.5 vanno create via Web UI GitHub o via `gh`
CLI. Non scriptabili nel repo.

**Quando affrontare:** prima di aprire la prima Issue (idealmente subito
dopo il primo push).

### DT-006 — `db:push` interattivo non pilotabile da Claude Code → usare `db:migrate`

`packages/database/drizzle.config.ts` ha `strict: true`, quindi
`pnpm db:push` (drizzle-kit push) mostra un menu di conferma interattivo a
frecce prima di eseguire le statement. La shell non interattiva di Claude Code
**non può guidare quel menu** → il comando resta bloccato.

**Metodo standard d'ora in poi:** applicare lo schema al DB con
**`pnpm db:migrate`**, che è non interattivo, applica i file di migrazione già
generati e revisionati (`migrations/*.sql`) e ne tiene lo storico in
`drizzle.__drizzle_migrations`. Flusso: `pnpm db:generate` → revisione del
`.sql` → `pnpm db:migrate`.

`db:push` resta utilizzabile solo manualmente da Stefano in un terminale
interattivo, se mai servisse un sync rapido senza migrazione.

**Quando affrontare:** già adottato. Voce informativa per le sessioni future.

### DT-007 — Compatibilità CAP degli slot temporaneamente disattivata

**Sessione:** 2026-06-10 (sviluppo autonomo).

L'algoritmo slot (`@wormhole/core` `calculateAvailableSlots`) accetta una
funzione `isCapCompatible(newCap, existingCaps)` per scartare gli slot in cui il
rider non farebbe in tempo a servire CAP troppo distanti (FEATURE_SPECS 4.5).
La logica reale richiede la **matrice distanze** (`cap_distance_matrix`), che
NON è ancora popolata (dipende da DT-002 — geocoding Nominatim dei CAP).

Per ora, in `apps/client/lib/slots.ts`, `isCapCompatible` ritorna **sempre
true**: si controlla solo la capacità numerica dello slot
(`ordersPerSlot`), non la compatibilità geografica.

**Quando affrontare:** dopo aver eseguito `scripts/distances-matrix.ts` per
popolare coordinate CAP + matrice. Poi sostituire lo stub con un lookup reale
sulla matrice (replicando la formula di `cap-compatibility.ts` già testata in
core) e passare la config rider del tenant.

### DT-008 — Prezzi menu da verificare (OCR)

**Sessione:** 2026-06-10.

Il menu reale è stato trascritto via OCR da foto (`docs/menu-reale.md`). Tre
prezzi erano segnalati come letture incerte `(?)` e vanno verificati contro il
menu cartaceo: **#38** Spaghetti di Soia con Carne Piccante (4,80€), **#60**
Pollo con Gamberi e Funghi (5,00€), **#92** Gamberi alla Griglia con Sale e Pepe
(7,00€). Anche email e numero civico del tenant sono ancora placeholder/da
confermare. Correggibili via aggiornamento del seed (o pannello admin futuro).

**Quando affrontare:** appena Stefano può controllare con la titolare.
