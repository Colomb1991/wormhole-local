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
