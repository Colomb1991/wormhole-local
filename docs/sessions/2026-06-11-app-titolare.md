# Sessione 2026-06-11 — App titolare (gestione ordini) + fix env monorepo

> Report per un Claude (o Stefano) a freddo. Complemento di `docs/PROGRESS.md`
> (2026-06-11). Sessione precedente: `2026-06-10-sviluppo-autonomo.md`.

---

## Contesto

- **Esecutore:** Claude Code locale, sessione autonoma estesa (carta bianca).
- **Punto di partenza:** app client completa e verificata a mano da Stefano
  (ordine #1 reale nel DB, stato pending). App owner = scheletro vuoto.
  80 → da 66 test della sessione precedente.
- **Vincoli rispettati:** solo `dev`, migrazioni additive, niente DELETE di
  massa (vedi sotto per i due delete singoli di dati di test creati in questa
  stessa sessione), `.env.local` mai letto/stampato/committato.

## ⚠️ DA SAPERE SUBITO: l'ordine #1 di Stefano è stato auto-annullato

L'ordine #1 (creato da Stefano il 2026-06-10 per verifica, rimasto `pending`)
è ora `cancelled` con motivo `"timeout: il ristorante non ha risposto in
tempo"`. **Non è un dato perso né un bug**: è la feature di timeout
(FEATURE_SPECS 10.3) appena implementata, che annulla i pending più vecchi di
`config.pendingOrderTimeoutMinutes` (5 min). Al primo caricamento della
dashboard owner lo sweep l'ha processato — l'ordine aveva già 2+ ore.
La riga è intatta, lo storico è in `status_history` (2 entry). Qualsiasi
nuovo ordine di prova va accettato entro 5 minuti dalla dashboard, altrimenti
si auto-annulla: comportamento voluto.

## Cronaca per blocco

### FIX-ENV (DT-009 → RIS-003 in KNOWN_ISSUES)

- Problema: Next legge i `.env*` solo dalla cartella dell'app; Stefano aveva
  dovuto copiare `.env.local` in `apps/client`.
- Fix: in testa ai 3 `next.config.ts` (client/owner/admin):
  `config({ path: resolve(__dirname, '../../.env.local'), override: true })`.
  `override: true` ⇒ **la root vince sempre** su copie locali stantie. In
  CI/Vercel il file non esiste ⇒ no-op (valgono le env di processo/progetto).
- `dotenv` aggiunto alle dipendenze delle 3 app.
- **Verifica:** rinominata temporaneamente la copia `apps/client/.env.local`
  (poi ripristinata, NON cancellata) → build client ok con la sola root.
  La copia di Stefano ora è superflua e può essere eliminata (SETUP.md sez. 1).
- Collaterale: `baseUrl: "."` aggiunto alle tsconfig di owner e admin (stesso
  difetto latente dell'alias `@/*` fixato sul client ieri).

### Auth titolare (FEATURE_SPECS 8.1, versione v0)

- **Schema** (migrazione additiva `0002_green_nighthawk.sql`, applicata):
  - `users.password_hash` varchar(255) **nullable** — auth v0 a password;
    l'aggancio Supabase Auth previsto dallo scaffolding resta upgrade futuro
    (per quegli utenti l'hash sarà null).
  - Nuova tabella `user_sessions` (token unico, TTL, tenant attivo) speculare
    a `customer_sessions`.
- **Hashing:** `@wormhole/core/auth/password` — scrypt di `node:crypto`
  (parametri nel formato stored, `timingSafeEqual`, zero dipendenze nuove).
  ⚠️ NON esportato dal barrel di core (usa `node:crypto`; il barrel arriva
  anche ai client component): **subpath export** dedicato in
  `packages/core/package.json` → import con `@wormhole/core/auth/password`.
- **Igiene dipendenze:** rimosso `@wormhole/database` dalle deps di core (mai
  importato); `@wormhole/core` aggiunto alle devDeps di database (il seed usa
  `hashPassword`). Niente cicli.
- **Seed (idempotente):** utente `titolare@almare.test` / password
  `almare2026` (solo `NODE_ENV !== 'production'`) + link in `tenant_users`.
  Se l'utente esiste senza hash, la password viene reimpostata.
- **Login:** `/login`, messaggio identico per email inesistente e password
  errata; sessione cookie HttpOnly `wh_owner_session`; logout.
  `lib/auth.ts`: `getOwnerSession()` memoizzata con `cache()`.

### Macchina a stati ordini (core, PURA, +8 test)

`packages/core/src/orders/transitions.ts`:
- `ORDER_TRANSITIONS` (pending→accepted|cancelled; accepted→preparing|cancelled;
  preparing→ready|cancelled; ready→in_delivery|cancelled;
  in_delivery→delivered|cancelled; delivered/cancelled terminali),
  `canTransition`, `isTerminalStatus`.
- `STATUS_TIMESTAMP_FIELD` (accepted→acceptedAt, ready→readyAt,
  delivered→deliveredAt, cancelled→cancelledAt).
- `buildStatusChange` (entry per `status_history`), `isPendingExpired` (10.3),
  `shouldAutoStartPreparing` (8.4, 30s).

### Dashboard ordini (owner `/`)

- Gruppi: 📥 NUOVI (pending, sempre visibile) / 👨‍🍳 IN PREPARAZIONE
  (accepted+preparing) / 🛍️ PRONTI / 🚴 IN CONSEGNA / ✅ CONSEGNATI OGGI /
  ❌ ANNULLATI OGGI. Header: "Oggi: N ordini • €X" (annullati esclusi).
- Query board: ordini **attivi di qualunque giorno** + chiusi di oggi
  (`startOfTodayRome`).
- **Polling 12s** (`fetchBoardAction`). Realtime Supabase = upgrade futuro.
- **Allarme pending:** 3 toni WebAudio (square 880/660 Hz, nessun file audio),
  ripetuto a ogni intervallo finché ci sono pending; vibrazione; badge
  `(N)` nel titolo della tab; toggle 🔔/🔇. Nota: autoplay policy (DT-011).

### Azioni ordine (8.4-8.8)

- Card con azioni per stato: ACCETTA / RIFIUTA (select motivi preimpostati) /
  MARCA PRONTO / 🚴 RIDER USCITO / ✅ CONSEGNATO **con input codice consegna**
  (match contro `orders.delivery_code`, errore se sbagliato) / "Annulla
  ordine" (con confirm) per gli stati intermedi.
- Tutte le action passano da `applyOrderTransition` (`apps/owner/lib/orders.ts`):
  sessione owner verificata, tenant matching, `canTransition`, append su
  `status_history`, timestamp di stato, `rejection_reason` per gli annulli,
  **guardia ottimistica**: l'UPDATE filtra anche sullo stato di partenza —
  se un altro dispositivo ha già cambiato stato, 0 righe → errore "ricarica".

### Manutenzione lazy (timeout 10.3 + auto-preparing 8.4)

`sweepStaleOrders(tenantId, timeoutMinutes)` eseguita a ogni caricamento/poll
della dashboard: pending oltre timeout → cancelled (motivo tracciato);
accepted >30s → preparing. **Limite noto:** gira solo se la dashboard viene
aperta (DT-010) — con le push notification andrà spostata in un cron.

### Dettaglio, comanda, storico, pausa

- `/orders/[id]`: cliente (nome/telefono via join `customers`), codice
  consegna in evidenza, indirizzo, card azioni (stessa della dashboard),
  totali con resto, timeline da `status_history`.
- `/orders/[id]/comanda`: vista monospace stampabile a video, layout 9.3
  (80mm-friendly, `@media print` con `@page` margin). Mostra `[menu_number]`
  e IVA scorporata per aliquota — entrambi NON sono nello snapshot
  `orders.items`, lookup live su `menu_items` (piatti eliminati → senza
  numero, IVA fallback 10%). **Stampa fisica ESC/POS rinviata** (hardware).
- `/history`: ordini chiusi raggruppati per giorno, fatturato (solo delivered).
- **Pausa ordini:** toggle in header → upsert `tenant_pause_state`
  (`onConflictDoUpdate`); banner rosso lato owner; il client già la legge.

## Verifica (come è stato testato)

- `pnpm test` → **80 test** (66 +8 transizioni +6 password).
- typecheck + lint puliti (7 package); build owner e client verdi (tutte le
  rotte dynamic).
- **Runtime sul DB reale** (dev server porta 3001):
  - `/login` 200, `/` → 307 a `/login` senza cookie;
  - dashboard 200 e renderizzata con un cookie di sessione creato ad hoc;
  - **ciclo di vita completo** con un ordine di test creato via
    `createOrder` del client: pending→delivered passando da tutti gli stati,
    transizione illegale (pending→delivered) correttamente rifiutata,
    `status_history` a 6 entry, timestamp valorizzati.
  - Pulizia: rimossi SOLO l'ordine di test e la sessione di test creati in
    questa sessione (delete puntuali per id/token — non dati di Stefano).
    Nota: l'ordine di test ha consumato il numero #2 della sequenza.

## Decisioni prese in autonomia

1. **Auth contro `users`** (con `tenant_users` per l'associazione), non PIN:
   email+password è ciò che la sez. 8.1 prevede, senza Supabase Auth per ora.
2. **scrypt di node:crypto** invece di bcrypt: zero dipendenze nuove,
   parametri auto-descrittivi nello stored format.
3. **Subpath export** `@wormhole/core/auth/password` per non far entrare
   `node:crypto` nel barrel importato dai client component.
4. **Sweep lazy** invece di cron: nessuna infrastruttura job disponibile in
   questa fase; documentato come DT-010.
5. **Allarme WebAudio** invece di file mp3: niente asset, 3 toni ripetuti a
   ogni poll finché ci sono pending, con mute.
6. **Guardia ottimistica** sulle transizioni (UPDATE condizionato allo stato
   letto) per i conflitti multi-dispositivo.

## Cosa NON è stato fatto / prossimi passi

- **Notifiche push** (sez. 11) — il titolare riceve l'allarme solo a app
  aperta. Servono VAPID keys (DT-003) + service worker + cron per lo sweep.
- **Stato ordine realtime lato cliente** (sez. 10) — il cliente non vede
  ancora la timeline aggiornarsi; la pagina di conferma è statica.
- **Stampa termica ESC/POS via Web Bluetooth** (sez. 9) — serve hardware.
- **Annullamento cliente entro 2 min** (sez. 16.1), storico/riordina cliente
  (12), feedback (13), pannello admin/gestione menu (14).
- **Compatibilità CAP slot** ancora stub (DT-007, dipende da DT-002).
- Login titolare reale: l'utente seed è di test; per la produzione creare
  l'utente con email vera e password robusta (e valutare Supabase Auth).

## Note operative per il prossimo Claude

- App owner su porta 3001 (`pnpm --filter @wormhole/owner dev`). Login di
  test: `titolare@almare.test` / `almare2026` (solo dev).
- Env: UNA SOLA copia di `.env.local` nella root; i next.config la caricano
  con override (RIS-003). La copia in `apps/client` è superflua.
- Le transizioni di stato passano SEMPRE da `applyOrderTransition` — non
  aggiornare `orders.status` a mano, salta status_history e guardie.
- Script usa-e-getta contro il DB: file `.mts` DENTRO `packages/database`
  (in /tmp tsx li tratta come CJS e il top-level await esplode).
- Attenzione aprendo la dashboard: lo sweep annulla i pending scaduti.
