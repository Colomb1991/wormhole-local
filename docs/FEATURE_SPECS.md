# Feature Specifications — Wormhole Local

> **Specifiche operative di ogni feature.**
> Documento consultato durante l'implementazione concreta di ogni funzionalità.

---

## Indice

1. [Onboarding cliente al primo accesso](#1-onboarding-cliente-al-primo-accesso)
2. [Navigazione menu](#2-navigazione-menu)
3. [Carrello](#3-carrello)
4. [Slot di consegna (algoritmo completo)](#4-slot-di-consegna-algoritmo-completo)
5. [CAP e tariffe consegna](#5-cap-e-tariffe-consegna)
6. [Codice univoco cliente](#6-codice-univoco-cliente)
7. [Checkout e creazione ordine](#7-checkout-e-creazione-ordine)
8. [App titolare: ricezione ordini](#8-app-titolare-ricezione-ordini)
9. [Stampa comanda termica](#9-stampa-comanda-termica)
10. [Stato ordine e timeline](#10-stato-ordine-e-timeline)
11. [Notifiche cliente e titolare](#11-notifiche-cliente-e-titolare)
12. [Storico ordini e riordina](#12-storico-ordini-e-riordina)
13. [Feedback privato](#13-feedback-privato)
14. [Pannello admin e gestione menu](#14-pannello-admin-e-gestione-menu)
15. [Gestione orari, chiusure, festività](#15-gestione-orari-chiusure-festività)
16. [Annullamento e rimborsi](#16-annullamento-e-rimborsi)
17. [Pagamenti (predisposti, disattivati)](#17-pagamenti-predisposti-disattivati)

---

## 1. Onboarding cliente al primo accesso

### 1.1 Flusso

Quando un cliente apre l'app per la prima volta (URL del tipo `/r/cinese-livorno/`), il sistema deve capire se è un cliente nuovo o uno che torna.

**Step 1 — Landing page**

- Mostra logo e nome del ristorante (preso dal tenant)
- Tagline opzionale ("Consegna a domicilio • Livorno • dal 1998")
- Pulsante grande "Inizia a ordinare"
- Link footer: "Hai già un account? Inserisci il telefono"

**Step 2 — Identificazione cliente**

Pagina con un input numerico per telefono:

- Input formato italiano (+39 prefisso automatico)
- Placeholder "es. 333 1234567"
- Validazione lato client: 9-10 cifre dopo prefisso
- Pulsante "Continua"

Al click, query al backend:

```typescript
const customer = await db.query.customers.findFirst({
  where: and(eq(customers.tenantId, tenantId), eq(customers.phone, normalizedPhone)),
})
```

**Step 3a — Cliente esistente**

Se il customer è trovato:

- Mostra "Bentornato, [nome]!"
- Precompila campi nome e indirizzo (modificabili)
- Mostra il suo codice di consegna in evidenza ("Il tuo codice è: 7392 — il rider lo chiederà")
- Vai direttamente al menu

**Step 3b — Cliente nuovo**

Se non esiste, mostra form di registrazione:

- Nome (obbligatorio, min 2 char)
- Indirizzo di consegna (campo libero + selezione CAP da dropdown)
- Email (opzionale)
- Checkbox "Salva i miei dati per ordini futuri" (con tooltip GDPR)
- Pulsante "Crea profilo e inizia a ordinare"

Al submit:

1. Genera codice consegna univoco (4 cifre, vedi sezione 6)
2. Inserisci customer nel DB
3. Mostra schermata di benvenuto con il codice ben visibile
4. Pulsante "Vai al menu"

### 1.2 Normalizzazione telefono

Tutti i numeri vengono normalizzati in formato E.164:

```typescript
function normalizePhone(input: string): string {
  // Rimuovi spazi, trattini, punti
  const cleaned = input.replace(/[\s\-\.]/g, '')

  // Se inizia con 00, sostituisci con +
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.slice(2)
  }

  // Se inizia con +, lascia
  if (cleaned.startsWith('+')) {
    return cleaned
  }

  // Se inizia con 3 (cellulare italiano), prependi +39
  if (cleaned.startsWith('3') && cleaned.length === 10) {
    return '+39' + cleaned
  }

  // Default: assume +39
  return '+39' + cleaned
}
```

Salviamo sempre il formato normalizzato. Mostriamo all'utente il formato pulito.

### 1.3 Gestione errori

- Telefono non valido: messaggio chiaro inline
- Backend non raggiungibile: "Problemi tecnici, chiamaci al [tel]"
- Tenant non trovato (slug sbagliato): 404 con link alla home

---

## 2. Navigazione menu

### 2.1 Struttura della pagina menu

URL: `/r/[tenantSlug]/menu`

Layout:

- Header con logo ristorante, nome, info (orari oggi, status aperto/chiuso)
- Tabs/Sezioni categorie (Antipasti, Primi, Secondi, ecc.) — sticky in top
- Lista piatti per categoria
- Carrello floating in basso (se ci sono items)

### 2.2 Dati caricati

Server-side al load della pagina:

```typescript
const menuData = await db.query.menuItems.findMany({
  where: and(eq(menuItems.tenantId, tenantId), eq(menuItems.isAvailable, true)),
  orderBy: [asc(menuItems.category), asc(menuItems.sortOrder)],
})

// Raggruppa per categoria
const groupedMenu = groupBy(menuData, 'category')
```

Cache: il menu cambia raramente, può essere cachato per 5 minuti lato server.

### 2.3 Card piatto

Ogni piatto mostra:

- Immagine (se presente) o placeholder generico
- Nome
- Descrizione breve (opzionale)
- Prezzo formattato (es. "€ 8,50")
- Pulsante "+" per aggiungere al carrello
- Badge "Esaurito" se `isAvailable === false` (in grigio, non cliccabile)

Tap sulla card apre dettaglio piatto (modal o pagina). Tap sul "+" aggiunge direttamente.

### 2.4 Piatti senza personalizzazione (v0)

Per la v0, niente personalizzazione (no "senza cipolla", no doppio formaggio).
Il cliente aggiunge il piatto così com'è, può cambiare solo la quantità.

### 2.5 Ricerca e filtri

Per la v0: **niente ricerca, niente filtri**. Menu navigabile per categoria.

In v0.2 si può aggiungere campo ricerca in alto.

### 2.6 Indicatori operativi

In alto alla pagina menu, banner di stato:

**Se ristorante aperto e accetta ordini**:

```
🟢 Aperto • Consegna 19:00 - 22:00 • Min. 10€
```

**Se ristorante chiuso oggi (martedì)**:

```
🔴 Chiuso il martedì • Riapre mercoledì alle 19:00
```

**Se fuori orario consegna ma aperto in giornata**:

```
🟡 Le consegne iniziano alle 19:00 • Puoi prenotare ora
```

**Se ristorante in pausa forzata (titolare ha cliccato "Stop ordini")**:

```
🔴 Temporaneamente non accettiamo ordini • Riprova più tardi
```

---

## 3. Carrello

### 3.1 Stato del carrello

Salvato in Zustand store (memoria) + sincronizzato con LocalStorage per persistenza tra refresh:

```typescript
interface CartState {
  items: CartItem[]
  addItem(menuItem: MenuItem): void
  removeItem(itemId: string): void
  updateQuantity(itemId: string, quantity: number): void
  clear(): void

  // Computed
  itemCount: number
  subtotalCents: number
  totalPrepTimeMinutes: number // MAX(prep) + (n_items * buffer)
}

interface CartItem {
  menuItemId: string
  name: string
  unitPriceCents: number
  prepTimeMinutes: number
  quantity: number
  notes?: string // libero, opzionale
}
```

### 3.2 Logica di aggiunta

Quando aggiungi un piatto:

- Se già nel carrello: incrementa quantità
- Se nuovo: aggiungi con quantity = 1
- Animazione "+1" sul pulsante
- Feedback haptic (vibration breve su mobile)

### 3.3 Calcolo del tempo di preparazione

Funzione in `packages/core/src/cart/calculator.ts`:

```typescript
function calculatePrepTime(items: CartItem[], config: TenantConfig): number {
  if (items.length === 0) return 0

  const maxPrepTime = Math.max(...items.map((i) => i.prepTimeMinutes))

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  const bufferTime = totalQuantity * config.prepTimeBufferPerItem

  return maxPrepTime + bufferTime
}
```

**Esempi**:

- 1 spaghetti soia (5 min) → 5 + 1 = **6 min**
- 1 spaghetti + 1 ravioli (5 e 15 min) → 15 + 2 = **17 min**
- 4 piatti misti, max 15 min → 15 + 4 = **19 min**

### 3.4 UI carrello

Floating bar in fondo alla pagina menu:

- Mostra solo se `itemCount > 0`
- Mostra: `🛒 2 piatti • € 17,50` + "Vai al carrello"

Tap → pagina carrello:

- Lista piatti con quantità modificabile (+/- buttons)
- Subtotale visibile
- Banner se sotto minimo: "Mancano X € per la consegna minima di 10€"
- Pulsante "Continua" disabilitato se sotto soglia

### 3.5 Validazioni

Prima di passare al checkout, valida:

```typescript
function validateCart(cart: CartState, config: TenantConfig): ValidationResult {
  if (cart.items.length === 0) {
    return { valid: false, error: 'Carrello vuoto' }
  }

  if (cart.subtotalCents < config.minOrderAmount * 100) {
    return {
      valid: false,
      error: `Ordine minimo €${config.minOrderAmount}`,
    }
  }

  // Verifica che tutti i piatti siano ancora disponibili
  // (in caso di disponibilità cambiata mentre il cliente compone)
  // (controllo server-side al checkout)

  return { valid: true }
}
```

---

## 4. Slot di consegna (algoritmo completo)

Questa è la feature più complessa. **Leggere con attenzione.**

### 4.1 Input necessari per il calcolo

```typescript
interface SlotCalculatorInput {
  tenantId: string
  customerPostalCode: string
  cartPrepTime: number // minuti, da calcolo carrello
  currentTime: Date // ora attuale (Europe/Rome)
  cartItemsCount: number // per il buffer
}
```

### 4.2 Output

```typescript
interface AvailableSlot {
  startTime: Date
  endTime: Date
  remainingCapacity: number // 0 = pieno
  isAvailable: boolean
  isRecommended: boolean // primo slot disponibile è "consigliato"
  unavailabilityReason: SlotUnavailabilityReason | null
}

type SlotUnavailabilityReason =
  | 'past_time' // slot già passato
  | 'prep_time_exceeds' // ordine non pronto in tempo
  | 'capacity_full' // slot pieno
  | 'cap_incompatible' // CAP non compatibile con altri ordini
  | 'restaurant_closed' // ristorante chiuso quel giorno
```

### 4.3 Algoritmo step-by-step

```typescript
async function getAvailableSlots(input: SlotCalculatorInput): Promise<AvailableSlot[]> {
  // Step 1: carica config tenant
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, input.tenantId),
  })

  const config = tenant.config

  // Step 2: determina giorno della settimana e config giornaliera
  const dayName = format(input.currentTime, 'EEEE').toLowerCase()
  const dayConfig = config.weeklySchedule[dayName]

  // Se chiuso oggi
  if (!dayConfig.isOpen) {
    return generateClosedSlots()
  }

  // Step 3: genera lista slot teorici della finestra di consegna
  const slots = generateTheoreticalSlots(
    config.deliveryWindowStart, // "19:00"
    config.deliveryWindowEnd, // "22:00"
    config.slotDurationMinutes // 30 (default)
  )

  // Step 4: per ogni slot, calcola disponibilità
  const availableSlots: AvailableSlot[] = []

  for (const slot of slots) {
    const result = await checkSlotAvailability({
      slot,
      input,
      dayConfig,
      tenant,
    })

    availableSlots.push(result)
  }

  // Step 5: marca il primo disponibile come "raccomandato"
  const firstAvailable = availableSlots.find((s) => s.isAvailable)
  if (firstAvailable) {
    firstAvailable.isRecommended = true
  }

  return availableSlots
}
```

### 4.4 Verifica disponibilità singolo slot

```typescript
async function checkSlotAvailability(params: {
  slot: SlotTheoretical
  input: SlotCalculatorInput
  dayConfig: DayConfig
  tenant: Tenant
}): Promise<AvailableSlot> {
  const { slot, input, dayConfig } = params

  const baseSlot: AvailableSlot = {
    startTime: slot.startTime,
    endTime: slot.endTime,
    remainingCapacity: dayConfig.ordersPerSlot,
    isAvailable: false,
    isRecommended: false,
    unavailabilityReason: null,
  }

  // Check 1: slot nel passato?
  if (slot.startTime <= input.currentTime) {
    return {
      ...baseSlot,
      unavailabilityReason: 'past_time',
    }
  }

  // Check 2: c'è abbastanza tempo per preparare l'ordine?
  const minPrepEndTime = addMinutes(input.currentTime, input.cartPrepTime)
  if (minPrepEndTime > slot.startTime) {
    return {
      ...baseSlot,
      unavailabilityReason: 'prep_time_exceeds',
    }
  }

  // Check 3: capacità slot
  const ordersInSlot = await getOrdersInSlot(input.tenantId, slot.startTime)

  if (ordersInSlot.length >= dayConfig.ordersPerSlot) {
    return {
      ...baseSlot,
      remainingCapacity: 0,
      unavailabilityReason: 'capacity_full',
    }
  }

  // Check 4: compatibilità CAP con altri ordini dello slot
  const isCapCompatible = await checkCapCompatibility(
    input.tenantId,
    input.customerPostalCode,
    ordersInSlot.map((o) => o.deliveryPostalCode),
    params.tenant.config
  )

  if (!isCapCompatible) {
    return {
      ...baseSlot,
      unavailabilityReason: 'cap_incompatible',
    }
  }

  // Tutti i check passati: slot disponibile
  return {
    ...baseSlot,
    remainingCapacity: dayConfig.ordersPerSlot - ordersInSlot.length,
    isAvailable: true,
  }
}
```

### 4.5 Compatibilità CAP (logica intelligente)

```typescript
async function checkCapCompatibility(
  tenantId: string,
  newCap: string,
  existingCaps: string[],
  config: TenantConfig
): Promise<boolean> {
  if (existingCaps.length === 0) return true // primo ordine, sempre OK

  // Carica matrice distanze pre-calcolata
  const distanceMatrix = await getDistanceMatrix(tenantId)

  // Calcola "carico" attuale del rider per questo slot
  let totalEstimatedTime = 0

  for (const cap of existingCaps) {
    // Tempo andata + ritorno per ogni consegna esistente
    const distance = distanceMatrix.getDistance(cap)
    const travelTime = distance * 3 // 3 min per km in scooter urbano
    const stopTime = 2 // 2 min sosta per consegnare
    totalEstimatedTime += travelTime * 2 + stopTime
  }

  // Aggiungi tempo per la nuova consegna
  const newDistance = distanceMatrix.getDistance(newCap)
  const newTravelTime = newDistance * 3
  totalEstimatedTime += newTravelTime * 2 + 2

  // Confronta con tempo massimo per slot
  const maxTimePerSlot = config.slotDurationMinutes + 10 // buffer 10 min

  return totalEstimatedTime <= maxTimePerSlot
}
```

### 4.6 UI selezione slot

Pagina checkout, sezione "Quando vuoi riceverlo":

```
🕐 Tempo di preparazione: 17 min

Scegli quando vuoi riceverlo:

┌────────────────────────────────────┐
│ 🟢 19:30 — Consigliato             │
│    Tra 25 minuti                   │
└────────────────────────────────────┘
┌────────────────────────────────────┐
│ ⚪ 20:00                           │
│    Tra 55 minuti                   │
└────────────────────────────────────┘
┌────────────────────────────────────┐
│ ⚪ 20:30                           │
│    Tra 85 minuti                   │
└────────────────────────────────────┘
                  ...
```

Gli slot non disponibili non vengono mostrati (per ridurre confusione).

### 4.7 Aggiornamento real-time

Se mentre il cliente sta scegliendo lo slot, un altro cliente prende l'ultimo posto in quello slot:

- Al momento del submit dell'ordine, ri-verifica disponibilità lato server
- Se non più disponibile: errore chiaro "Lo slot scelto è appena stato preso. Scegli un altro orario."
- Cliente non perde il carrello, deve solo riselezionare slot

---

## 5. CAP e tariffe consegna

### 5.1 Setup iniziale: matrice distanze offline

Una sola volta, al setup del tenant, eseguiamo uno **script offline** che:

1. Identifica tutti i CAP serviti (configurati dalla titolare)
2. Per ognuno ottiene le coordinate del centroide tramite **OpenStreetMap Nominatim** (gratis)
3. Calcola le distanze in linea d'aria tra il CAP del ristorante e ogni CAP servito
4. Calcola le distanze tra ogni coppia di CAP serviti
5. Salva tutto in tabella `cap_distance_matrix`

Script in `scripts/distances-matrix.ts`:

```typescript
async function buildDistanceMatrix(tenantId: string) {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  })

  const servedCaps = await db.query.tenantPostalCodes.findMany({
    where: and(eq(tenantPostalCodes.tenantId, tenantId), eq(tenantPostalCodes.isServed, true)),
  })

  // Geocoding di ogni CAP via Nominatim
  for (const cap of servedCaps) {
    if (!cap.latitude || !cap.longitude) {
      const coords = await geocodeNominatim(`${cap.postalCode}, ${cap.city}, Italy`)
      await db
        .update(tenantPostalCodes)
        .set({ latitude: coords.lat, longitude: coords.lon })
        .where(eq(tenantPostalCodes.id, cap.id))

      await sleep(1000) // Nominatim rate limit: 1 req/sec
    }
  }

  // Distanza dal ristorante
  const restaurantCoords = {
    lat: parseFloat(tenant.latitude),
    lon: parseFloat(tenant.longitude),
  }

  for (const cap of servedCaps) {
    const distance = haversineDistance(restaurantCoords, { lat: cap.latitude, lon: cap.longitude })

    await db
      .update(tenantPostalCodes)
      .set({ distanceFromRestaurantKm: distance })
      .where(eq(tenantPostalCodes.id, cap.id))
  }

  // Matrice distanze tra coppie CAP
  for (let i = 0; i < servedCaps.length; i++) {
    for (let j = i + 1; j < servedCaps.length; j++) {
      const dist = haversineDistance(
        { lat: servedCaps[i].latitude, lon: servedCaps[i].longitude },
        { lat: servedCaps[j].latitude, lon: servedCaps[j].longitude }
      )

      await db.insert(capDistanceMatrix).values({
        tenantId,
        capA: servedCaps[i].postalCode,
        capB: servedCaps[j].postalCode,
        distanceKm: dist,
      })
    }
  }
}
```

### 5.2 Calcolo distanza in linea d'aria (Haversine)

```typescript
function haversineDistance(
  coord1: { lat: number; lon: number },
  coord2: { lat: number; lon: number }
): number {
  const R = 6371 // Raggio Terra in km

  const lat1Rad = toRadians(coord1.lat)
  const lat2Rad = toRadians(coord2.lat)
  const deltaLat = toRadians(coord2.lat - coord1.lat)
  const deltaLon = toRadians(coord2.lon - coord1.lon)

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}
```

### 5.3 Selezione CAP cliente

In fase di onboarding e checkout, il cliente seleziona il CAP da un **dropdown** che mostra solo i CAP serviti:

```
CAP di consegna: [Seleziona ▼]
   57121 - Livorno Centro
   57122 - Livorno Nord
   57123 - Livorno Sud
   57125 - Livorno Stazione
   57126 - Livorno Mazzini
   57127 - Livorno Periferia Est
```

Ognuna mostra anche la tariffa di consegna a fianco se vogliamo (es. "57121 - 2,00€").

### 5.4 CAP non servito

Se il cliente cerca di inserire un CAP non servito (in v0 non capita perché c'è dropdown, ma per sicurezza):

- Errore chiaro: "Mi dispiace, non consegniamo a questo CAP"
- Suggerimento: "Contatta il ristorante per accordi speciali al telefono [numero]"

### 5.5 Aggiunta di nuovi CAP nel tempo

La titolare può aggiungere nuovi CAP dal pannello admin:

1. Form: CAP + città + tariffa + zona
2. Salva nel DB con `isServed: true`
3. Trigger automatico esegue update della matrice distanze per il nuovo CAP

---

## 6. Codice univoco cliente

### 6.1 Cos'è

Codice di **4 cifre** (es. 7392) **fisso per ogni cliente**, usato dal rider alla consegna per verifica identità.

Come Deliveroo: stesso codice per sempre per quel cliente in quel tenant.

### 6.2 Generazione

Al primo ordine di un cliente, genera codice:

```typescript
async function generateCustomerCode(tenantId: string): Promise<string> {
  const MAX_ATTEMPTS = 10

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    // Genera 4 cifre random
    const code = Math.floor(1000 + Math.random() * 9000).toString()

    // Verifica unicità per questo tenant
    const existing = await db.query.customers.findFirst({
      where: and(eq(customers.tenantId, tenantId), eq(customers.deliveryCode, code)),
    })

    if (!existing) {
      return code
    }
  }

  // Fallback: dopo 10 tentativi, prova con 5 cifre
  // (Improbabile su scala normale, ma protezione)
  return Math.floor(10000 + Math.random() * 90000).toString()
}
```

**Probabilità di collisione**: con 4 cifre = 9000 codici disponibili (1000-9999). Se un tenant ha 1000 clienti, probabilità di non trovare codice libero al primo tentativo: ~11%. Dopo 10 tentativi: <0.001%.

### 6.3 Esposizione del codice

**Cliente**: vede il codice in:

- Schermata di benvenuto dopo registrazione (grande, centrato)
- Profilo (sezione "Il mio codice di consegna")
- Pagina conferma ordine (ben visibile)
- Notifica push "Il tuo ordine è in consegna" mostra il codice

**Titolare**: vede il codice in:

- Dettaglio ordine
- Comanda stampata (in evidenza)

**Rider** (tramite titolare): vede il codice sulla comanda cartacea, lo chiede al cliente alla consegna.

### 6.4 Verifica al momento della consegna

Il rider arriva, chiede al cliente "Il suo codice?". Cliente dice "7392". Se corrisponde, consegna.

Se il cliente non ricorda:

- Può vedere il codice nell'app (sempre visibile in profilo)
- Se non ha l'app aperta, il rider chiama la titolare che verifica

**Nessuna validazione automatica in v0** (per non complicare). In futuro l'app rider richiederà input del codice per "sbloccare" la consegna.

---

## 7. Checkout e creazione ordine

### 7.1 Flusso checkout

URL: `/r/[tenantSlug]/checkout`

Pagina con 4 sezioni in sequenza:

**Sezione 1 — Riepilogo ordine** (sempre visibile)

- Lista piatti con quantità e prezzi
- Subtotale
- (Tariffa consegna dopo selezione CAP)
- Totale

**Sezione 2 — Indirizzo di consegna**

- Form precompilato se cliente registrato
- Indirizzo (street + numero civico + dettagli)
- Selezione CAP (dropdown)
- Mostra tariffa di consegna applicata dopo selezione CAP
- Eventuali note di consegna (es. "citofono Bianchi")

**Sezione 3 — Orario di consegna**

- Lista slot disponibili (vedi sezione 4)
- Cliente sceglie uno slot
- Mostra messaggio: "Il tuo ordine arriva alle 19:30"

**Sezione 4 — Pagamento**
Per la v0 con Stripe disattivato:

- Solo opzione "Pagamento alla consegna" (selected by default)
- Campo: "Hai bisogno di resto? Pagherai con:"
  - Default: totale ordine (es. 27,50€)
  - Cliente può scrivere importo maggiore (es. 30€)
  - Validazione: max 50€
  - Calcolo automatico resto da dare

Per il futuro con Stripe attivo:

- Radio button: "Pagamento alla consegna" / "Pagamento online"
- Se online: form Stripe Elements

**Pulsante finale**: "Conferma ordine" — disabilitato finché tutte le sezioni complete

### 7.2 Submit ordine

Server Action `createOrder`:

```typescript
'use server'

export async function createOrder(data: CreateOrderInput) {
  // 1. Valida sessione cliente (telefono)
  const customer = await getCustomerFromSession(data.phone)
  if (!customer) throw new UnauthorizedError()

  // 2. Validazioni
  validateCart(data.items, tenant.config)
  validateAddress(data.address)

  // 3. Ricarica menu items per validare prezzi (anti-tampering)
  const dbMenuItems = await db.query.menuItems.findMany({
    where: inArray(
      menuItems.id,
      data.items.map((i) => i.menuItemId)
    ),
  })

  // Verifica che i prezzi non siano stati manomessi lato client
  for (const item of data.items) {
    const dbItem = dbMenuItems.find((d) => d.id === item.menuItemId)
    if (!dbItem) throw new Error(`Piatto ${item.menuItemId} non trovato`)
    if (!dbItem.isAvailable) throw new Error(`Piatto ${dbItem.name} non disponibile`)
    if (dbItem.price !== item.unitPriceCents) {
      throw new Error(`Prezzo cambiato per ${dbItem.name}`)
    }
  }

  // 4. Verifica slot ancora disponibile
  const slotCheck = await checkSlotAvailability({
    tenantId: tenant.id,
    slot: data.scheduledSlot,
    cartPrepTime: calculatePrepTime(data.items, tenant.config),
    postalCode: data.address.postalCode,
  })

  if (!slotCheck.isAvailable) {
    throw new SlotUnavailableError(slotCheck.unavailabilityReason)
  }

  // 5. Genera order number sequenziale per tenant
  const orderNumber = await generateNextOrderNumber(tenant.id)

  // 6. Crea ordine in transaction
  const order = await db.transaction(async (tx) => {
    const [newOrder] = await tx
      .insert(orders)
      .values({
        tenantId: tenant.id,
        customerId: customer.id,
        orderNumber,
        items: data.items, // JSON snapshot
        subtotalCents: calculateSubtotal(data.items),
        deliveryFeeCents: getDeliveryFee(tenant.id, data.address.postalCode),
        totalCents: calculateTotal(data.items, deliveryFee),
        deliveryAddress: data.address,
        deliveryPostalCode: data.address.postalCode,
        scheduledSlot: data.scheduledSlot,
        deliveryCode: customer.deliveryCode,
        paymentMethod: data.paymentMethod,
        paymentStatus: 'pending',
        customerPayingWithCents: data.customerPayingWithCents,
        changeToGiveCents: calculateChange(total, data.customerPayingWithCents),
        status: 'pending',
        customerNotes: data.notes,
        statusHistory: [
          {
            status: 'pending',
            at: new Date(),
            byUserId: null,
          },
        ],
        createdAt: new Date(),
      })
      .returning()

    return newOrder
  })

  // 7. Notifica titolare (async, non aspettare)
  notifyOwnerNewOrder(tenant.id, order.id).catch((err) =>
    logger.error({ err, orderId: order.id }, 'Failed to notify owner')
  )

  // 8. Email conferma cliente (async)
  if (customer.email) {
    sendOrderConfirmationEmail(customer.email, order).catch((err) =>
      logger.error({ err }, 'Failed to send confirmation email')
    )
  }

  // 9. Log audit
  await logAudit({
    action: 'create_order',
    resourceType: 'order',
    resourceId: order.id,
    tenantId: tenant.id,
  })

  return { success: true, orderId: order.id, orderNumber }
}
```

### 7.3 Pagina conferma ordine

Dopo submit riuscito, redirect a `/r/[tenantSlug]/orders/[orderId]/confirmed`:

- Animazione di successo
- "Ordine #1547 ricevuto!"
- "Il ristorante sta confermando, riceverai una notifica"
- Codice consegna in evidenza
- Riepilogo ordine
- Stato in tempo reale (vedi sezione 10)
- Tasto "Torna al menu"

---

## 8. App titolare: ricezione ordini

### 8.1 Login titolare

URL: `/owner/login`

- Email + password
- Supabase Auth gestisce token
- "Ricordami" opzione (sessione 30 giorni)
- Dopo login → dashboard

### 8.2 Dashboard ordini

URL: `/owner/dashboard`

Layout principale per smartphone:

```
┌─────────────────────────────────────┐
│  🔔  Ristorante USDT      ⚙️  ⏸️    │ <- toggle pausa ordini
├─────────────────────────────────────┤
│  Oggi: 8 ordini  •  €245,30         │
├─────────────────────────────────────┤
│  📥 NUOVI (1)                       │
│  ┌─────────────────────────────┐   │
│  │ #1547  •  19:30  •  €27,50 │   │
│  │ Marco B.  •  💵 contanti    │   │
│  │ [ ACCETTA ]  [ RIFIUTA ]    │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  👨‍🍳 IN PREPARAZIONE (2)            │
│  ┌─────────────────────────────┐   │
│  │ #1546  •  19:15             │   │
│  │ [ MARCA PRONTO ]            │   │
│  └─────────────────────────────┘   │
│  ...                                │
├─────────────────────────────────────┤
│  🚴 IN CONSEGNA (1)                 │
│  ...                                │
├─────────────────────────────────────┤
│  ✅ CONSEGNATI OGGI (4)             │
│  ...                                │
└─────────────────────────────────────┘
```

### 8.3 Notifiche push real-time

Quando arriva un nuovo ordine:

- Notifica push sonora (suono allarme, non normale notifica)
- Vibrazione lunga del dispositivo
- Apparizione automatica in cima alla dashboard
- Badge contatore (es. "🔔 1") nell'icona dell'app

Implementazione: Supabase Realtime channel per tenant.

### 8.4 Accettazione ordine

Tap su "ACCETTA":

```typescript
async function acceptOrder(orderId: string) {
  // 1. Update stato a 'accepted'
  await db
    .update(orders)
    .set({
      status: 'accepted',
      acceptedAt: new Date(),
      statusHistory: [
        ...current.statusHistory,
        { status: 'accepted', at: new Date(), byUserId: ownerUser.id },
      ],
    })
    .where(eq(orders.id, orderId))

  // 2. Stampa comanda termica (vedi sezione 9)
  await printOrderTicket(orderId)

  // 3. Notifica cliente
  await notifyCustomerOrderAccepted(orderId)

  // 4. Automatica transizione a 'preparing' (dopo 30 secondi o subito)
  setTimeout(async () => {
    await db.update(orders).set({ status: 'preparing' }).where(eq(orders.id, orderId))
  }, 30000)
}
```

### 8.5 Rifiuto ordine

Tap su "RIFIUTA":

- Modal: "Sei sicuro? Specifica motivo (opzionale):"
- Possibili motivi pre-impostati: "Ingredienti finiti", "Cucina chiusa", "CAP non servito ora", "Altro"
- Conferma rifiuto

```typescript
async function rejectOrder(orderId: string, reason: string) {
  await db
    .update(orders)
    .set({
      status: 'cancelled',
      rejectionReason: reason,
      cancelledAt: new Date(),
    })
    .where(eq(orders.id, orderId))

  // Se pagamento online: rimborso automatico (futuro Stripe)
  // Se contanti: nessun rimborso necessario

  await notifyCustomerOrderRejected(orderId, reason)
}
```

### 8.6 Marcare ordine come pronto

Dalla card "IN PREPARAZIONE", tap "MARCA PRONTO":

- Update status a `ready`
- Notifica cliente: "Il tuo ordine è pronto, il rider sta arrivando"
- L'ordine passa nella sezione "PRONTO PER CONSEGNA"

### 8.7 Marcare ordine come in consegna

La titolare consegna fisicamente l'ordine al rider. Tap "RIDER USCITO":

- Update status a `in_delivery`
- Notifica cliente: "Il tuo ordine è in consegna"

### 8.8 Marcare consegnato

Quando il rider torna o telefona dicendo "consegnato":

- La titolare tap "CONSEGNATO" sulla card
- Update status a `delivered`
- L'ordine passa nella sezione "CONSEGNATI OGGI"
- Notifica cliente: "Ordine consegnato, grazie!"
- Mostra al cliente richiesta feedback (vedi sezione 13)

### 8.9 Pulsante "Stop Ordini"

In alto a destra, toggle "⏸️ Pausa ordini":

- Quando attivo, l'app cliente mostra banner rosso "Temporaneamente non accettiamo ordini"
- Gli ordini già in coda continuano regolarmente
- Si può riattivare quando vuole

Use cases:

- "Sto per chiudere, basta ordini"
- "Troppi ordini, non riesco a stare dietro"
- "Sono finiti certi ingredienti chiave"

### 8.10 Cambio modalità rider

Toggle "🚴 Rider attivi: 1" / "🚴 Rider attivi: 2":

- Override manuale del config settimanale
- Es. lunedì normalmente 1 rider ma stasera ci sono 2 → toggle a 2
- Aggiorna capacità slot dinamicamente

---

## 9. Stampa comanda termica

### 9.1 Hardware

Stampante termica Bluetooth 80mm (Star Micronics TSP143IIIBI o Epson TM-m30):

- Linguaggio ESC/POS standard
- Connessione Bluetooth a smartphone titolare
- Carta termica continua

### 9.2 Connessione iniziale

Setup una sola volta:

1. Titolare apre app → Settings → "Stampante"
2. Tap "Connetti stampante"
3. Browser chiede permesso Web Bluetooth
4. Lista dispositivi Bluetooth disponibili
5. Selezione stampante → pairing
6. Test stampa (stampa scontrino test)
7. Salva ID dispositivo per riconnessioni future

### 9.3 Layout comanda stampata

```
============================
   RISTORANTE CINESE USDT
   Corso Mazzini 341
   Livorno
============================

ORDINE #1547
15/05/2026 19:05
Slot consegna: 19:30

============================
CLIENTE:
Marco Bianchi
+39 333 1234567
Cod. consegna: 7392

INDIRIZZO:
Via XX Settembre, 15
57125 Livorno
Note: citofono Bianchi

============================
PIATTI:

2x Spaghetti di soia          11,00
   con verdure
   (prep 5min)

1x Ravioli alla piastra        6,00
   (prep 15min)

============================
                Subtotale: 17,00
       Consegna (57125):   2,50
============================
                  TOTALE: 19,50

💵 PAGAMENTO ALLA CONSEGNA
Da incassare:        19,50 €
Cliente paga con:    20,00 €
RESTO DA DARE:        0,50 €

============================
Tempo prep totale: 19 min
============================
```

### 9.4 Codice stampa

```typescript
async function printOrderTicket(orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      customer: true,
      tenant: true,
    },
  })

  const printerCommands = buildEscPosCommands(order)

  // Connetti a stampante via Web Bluetooth
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
  })

  const server = await device.gatt.connect()
  const service = await server.getPrimaryService(PRINTER_SERVICE_UUID)
  const characteristic = await service.getCharacteristic(PRINTER_CHAR_UUID)

  // Invia comandi
  await characteristic.writeValue(printerCommands)

  logger.info({ orderId }, 'Order ticket printed')
}
```

### 9.5 ESC/POS commands

Libreria utility `packages/core/src/printer/escpos.ts`:

```typescript
const ESC = 0x1b
const GS = 0x1d

const COMMANDS = {
  INIT: [ESC, 0x40],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [GS, 0x21, 0x01],
  NORMAL_HEIGHT: [GS, 0x21, 0x00],
  CUT_PAPER: [GS, 0x56, 0x42, 0x00],
  LINE_FEED: [0x0a],
}

function buildEscPosCommands(order: Order): Uint8Array {
  const commands: number[] = []

  // Init
  commands.push(...COMMANDS.INIT)

  // Header centered + bold
  commands.push(...COMMANDS.ALIGN_CENTER)
  commands.push(...COMMANDS.BOLD_ON)
  commands.push(...encodeText(order.tenant.name + '\n'))
  commands.push(...COMMANDS.BOLD_OFF)
  commands.push(...encodeText(order.tenant.address + '\n'))

  // ... resto del layout

  // Taglio carta
  commands.push(...COMMANDS.CUT_PAPER)

  return new Uint8Array(commands)
}
```

### 9.6 Gestione errori stampa

Se la stampa fallisce (stampante offline, scollegata, batteria scarica):

- Notifica titolare con icona errore
- Bottone "Riprova stampa" sull'ordine
- Bottone "Mostra comanda" per visualizzare sullo schermo (fallback)
- Log errore

### 9.7 Stampa duplicata se necessario

Sull'ordine appare sempre il bottone "🖨️ Ristampa comanda" se serve (es. carta finita).

---

## 10. Stato ordine e timeline

### 10.1 Pagina stato ordine cliente

URL: `/r/[tenantSlug]/orders/[orderId]`

Cliente vede:

- Order number, data, ora
- Timeline visuale con stati:

```
🟢 Ricevuto       19:05  ✓
🟢 Accettato      19:06  ✓
🟢 In preparazione 19:07  ✓
⚪ Pronto         --:--  in attesa
⚪ In consegna    --:--  in attesa
⚪ Consegnato     --:--  in attesa
```

Aggiornamento real-time via Supabase Realtime channel per orderId.

### 10.2 Stati e transizioni

```
pending ──accept──> accepted ──auto 30s──> preparing ──ready──> ready ──out──> in_delivery ──delivered──> delivered
   │                    │
   └────reject────> cancelled
                        │
       (timeout 5min) ──┘
       (cliente cancel entro 2min) ──┘
```

### 10.3 Timeout automatici

**Pending → Cancelled automatico** dopo **5 minuti** senza accettazione titolare:

- Job background controlla ogni minuto
- Se ordine `pending` da più di 5 min: cancellazione automatica
- Notifica cliente: "Il ristorante non ha risposto in tempo, l'ordine è stato annullato"
- Possibile attivare/disattivare in config tenant

### 10.4 Stato in evidenza

In ogni schermata cliente, in alto, badge stato corrente:

```
🟢 Il tuo ordine è in preparazione
   Tempo stimato consegna: 19:30
```

Con icona animata pulsante per gli stati attivi.

---

## 11. Notifiche cliente e titolare

### 11.1 Canali notifiche

| Tipo notifica                | Push (app installata) | Email         | SMS |
| ---------------------------- | --------------------- | ------------- | --- |
| Ordine ricevuto (cliente)    | ✓                     | ✓ se ha email | ✗   |
| Ordine accettato (cliente)   | ✓                     | ✗             | ✗   |
| Ordine in consegna (cliente) | ✓                     | ✗             | ✗   |
| Ordine consegnato (cliente)  | ✓                     | ✗             | ✗   |
| Ordine annullato (cliente)   | ✓                     | ✓ se ha email | ✗   |
| **NUOVO ordine (titolare)**  | ✓ (sonoro forte)      | ✗             | ✗   |
| Ordine timeout (titolare)    | ✓                     | ✗             | ✗   |

### 11.2 Service Worker per push

File `apps/client/public/sw.js`:

```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json()

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: [200, 100, 200],
      data: { orderId: data.orderId, url: data.url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
```

### 11.3 Email transazionali

Template con Resend, in `packages/core/src/notifications/email-templates/`:

- `order-confirmation.tsx` (React Email)
- `order-cancelled.tsx`
- `password-reset.tsx` (per titolare)

Esempio:

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'Wormhole Local <noreply@wormhole-local.it>',
  to: customer.email,
  subject: `Ordine #${order.orderNumber} ricevuto`,
  react: <OrderConfirmationEmail order={order} />
})
```

### 11.4 Suono notifica titolare

Critico: la notifica nuovo ordine deve essere **impossibile da ignorare**.

- Suono di allarme (3 toni ripetuti)
- File audio in `/owner/public/sounds/new-order.mp3`
- Riproduzione automatica via Audio API + service worker
- Continua a suonare finché la titolare non apre l'app o tappa "Silenzia"

```javascript
// Service worker
self.addEventListener('push', (event) => {
  if (event.data.json().type === 'new_order') {
    event.waitUntil(
      self.registration.showNotification('🔔 NUOVO ORDINE', {
        body: `Ordine #${data.orderNumber} - €${data.total}`,
        icon: '/icon-192.png',
        sound: '/sounds/new-order.mp3',
        requireInteraction: true, // non si chiude da sola
        vibrate: [500, 200, 500, 200, 500],
      })
    )
  }
})
```

---

## 12. Storico ordini e riordina

### 12.1 Pagina storico cliente

URL: `/r/[tenantSlug]/profile/orders`

Mostra **ultimi 10 ordini** del cliente, ordinati dal più recente:

```
┌─────────────────────────────────────┐
│ #1547  •  15/05/2026  •  €19,50    │
│ Ravioli, Spaghetti di soia          │
│ 🟢 Consegnato                       │
│ [ 🔄 Riordina ]                     │
├─────────────────────────────────────┤
│ #1523  •  10/05/2026  •  €24,00    │
│ Pollo agrodolce, Riso, Bibita       │
│ 🟢 Consegnato                       │
│ [ 🔄 Riordina ]                     │
├─────────────────────────────────────┤
│ ...                                 │
└─────────────────────────────────────┘
```

Tap su un ordine → dettaglio completo

### 12.2 Funzione "Riordina"

Tap su "🔄 Riordina":

- Replica i piatti dell'ordine vecchio nel carrello attuale
- Verifica disponibilità piatti (se uno è stato eliminato dal menu, mostra warning)
- Verifica disponibilità (se un piatto è esaurito oggi, lo segnala)
- Cliente viene portato a `/cart` con piatti pre-caricati
- Cliente può modificare quantità o aggiungere altro prima di procedere

```typescript
async function reorderFromPrevious(orderId: string): Promise<CartItem[]> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  })

  const cartItems: CartItem[] = []
  const unavailableItems: string[] = []

  for (const item of order.items) {
    const currentMenuItem = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, item.menuItemId), eq(menuItems.tenantId, order.tenantId)),
    })

    if (!currentMenuItem) {
      unavailableItems.push(item.name + ' (rimosso dal menu)')
      continue
    }

    if (!currentMenuItem.isAvailable) {
      unavailableItems.push(item.name + ' (esaurito)')
      continue
    }

    cartItems.push({
      menuItemId: currentMenuItem.id,
      name: currentMenuItem.name,
      unitPriceCents: currentMenuItem.price, // usa prezzo attuale, non vecchio
      prepTimeMinutes: currentMenuItem.prepTimeMinutes,
      quantity: item.quantity,
    })
  }

  return { items: cartItems, warnings: unavailableItems }
}
```

### 12.3 Conferma se piatti non disponibili

Se alcuni piatti dell'ordine vecchio non sono disponibili:

```
⚠️ Alcuni piatti non sono più disponibili:
   • Spaghetti di soia (esaurito)
   • Riso alla cantonese (rimosso dal menu)

Vuoi continuare con gli altri piatti?
[ Annulla ]  [ Continua con piatti disponibili ]
```

---

## 13. Feedback privato

### 13.1 Quando chiedere feedback

Dopo che l'ordine è marcato `delivered`:

- Notifica push: "Com'è andato il tuo ordine?"
- Tap → pagina feedback

### 13.2 Pagina feedback

URL: `/r/[tenantSlug]/orders/[orderId]/feedback`

Layout minimale:

```
Com'è andato il tuo ordine?

⭐ ⭐ ⭐ ⭐ ⭐
1    2    3    4    5

Vuoi aggiungere un commento? (opzionale)
[ textarea ]

ℹ️ Il tuo feedback è privato e visibile solo
   al ristorante. Aiuta a migliorare il servizio.

[ Invia feedback ]  [ Salta ]
```

### 13.3 Submit feedback

```typescript
async function submitFeedback(data: FeedbackInput) {
  // Verifica che l'ordine esista, sia delivered, e appartenga al customer
  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, data.orderId),
      eq(orders.customerId, customer.id),
      eq(orders.status, 'delivered')
    ),
  })

  if (!order) throw new ForbiddenError()

  // Verifica che non ci sia già un feedback (1 per ordine)
  const existing = await db.query.feedback.findFirst({
    where: eq(feedback.orderId, data.orderId),
  })

  if (existing) throw new ConflictError('Feedback già inviato')

  // Insert
  await db.insert(feedback).values({
    tenantId: order.tenantId,
    orderId: order.id,
    customerId: customer.id,
    rating: data.rating,
    comment: data.comment,
    isInternal: true,
    createdAt: new Date(),
  })

  return { success: true }
}
```

### 13.4 Visualizzazione titolare

Nel pannello titolare, sezione "Feedback":

- Lista feedback ricevuti, ordinati dal più recente
- Filtri: per rating, per data
- Statistiche: rating medio, distribuzione
- **MAI visibili pubblicamente**, solo per la titolare

```
Feedback ricevuti:

⭐⭐⭐⭐⭐ — Marco B. (Ordine #1547)
"Tutto perfetto come sempre, grazie!"
15/05/2026

⭐⭐⭐ — Lucia M. (Ordine #1545)
"Buono ma la consegna è arrivata in ritardo"
14/05/2026
```

---

## 14. Pannello admin e gestione menu

### 14.1 Accesso admin

Due livelli di admin:

**Super Admin** (Stefano):

- Vede tutti i tenant
- Può creare nuovi tenant
- Configurazioni di sistema
- URL: `/admin`

**Owner Admin** (titolare):

- Vede solo il proprio tenant
- Gestione menu del proprio ristorante
- Configurazioni del proprio ristorante
- URL: `/owner/admin` (collegato dall'app titolare)

### 14.2 Gestione menu

URL: `/owner/admin/menu`

Lista piatti raggruppati per categoria, con azioni per ognuno:

- Edit nome, prezzo, descrizione, tempo prep
- Marca disponibile/esaurito (toggle veloce)
- Carica/cambia foto
- Riordina drag-and-drop (sortOrder)
- Elimina (soft delete: il piatto non viene cancellato, viene marcato `deleted_at`, così gli ordini storici restano)

### 14.3 Aggiunta nuovo piatto

Form:

- Nome (required)
- Descrizione (optional)
- Categoria (dropdown con categorie esistenti o "nuova")
- Prezzo in euro (verrà convertito in centesimi)
- Tempo preparazione minuti (required)
- IVA (10% o 22%)
- Foto (upload, max 5MB, ridimensionata automaticamente)
- isAvailable (toggle, default true)
- sortOrder (auto-incrementale, ultimo per categoria)

### 14.4 Gestione foto

Upload via Supabase Storage:

- Bucket: `tenant-{tenantId}-menu`
- Compressione automatica a max 800x800
- Generazione thumbnail 200x200 per liste
- Format WebP per performance
- Cleanup automatico quando piatto eliminato

```typescript
async function uploadMenuItemPhoto(
  tenantId: string,
  menuItemId: string,
  file: File
): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${menuItemId}.${fileExt}`
  const path = `${tenantId}/${fileName}`

  const { data, error } = await supabase.storage.from('menu-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })

  if (error) throw error

  const {
    data: { publicUrl },
  } = supabase.storage.from('menu-photos').getPublicUrl(path)

  return publicUrl
}
```

### 14.5 Configurazioni ristorante

URL: `/owner/admin/settings`

Sezioni:

**Info generali**:

- Nome, indirizzo, telefono, email
- Logo, colore brand
- Descrizione breve (mostrata nell'app cliente)

**Operatività**:

- Orari apertura settimanali (con toggle per ogni giorno)
- Slot duration (15/20/30 minuti)
- Capacity orders per slot (per giorno della settimana)
- Soglia minima ordine
- Resto massimo

**CAP serviti**:

- Lista CAP attivi con tariffe
- Aggiungi/elimina CAP
- Modifica tariffa per CAP

**Notifiche**:

- Email notifiche
- Audio personalizzato per notifiche

### 14.6 Statistiche

URL: `/owner/admin/stats`

Dashboard con:

- Ordini giornalieri (grafico ultimi 30 giorni)
- Fatturato (giorno/settimana/mese)
- Ordine medio
- Top 10 piatti più ordinati
- Ore di punta (heatmap settimanale)
- Tasso di rifiuto ordini
- Tempo medio preparazione vs slot scelto

Calcolate con query SQL aggregate, no strumenti esterni.

---

## 15. Gestione orari, chiusure, festività

### 15.1 Settimana standard

Configurazione settimanale in `tenant.config.weeklySchedule`:

```typescript
{
  monday: { isOpen: true, riderCount: 1, ordersPerSlot: 3 },
  tuesday: { isOpen: false, riderCount: 0, ordersPerSlot: 0 },
  wednesday: { isOpen: true, riderCount: 1, ordersPerSlot: 3 },
  thursday: { isOpen: true, riderCount: 1, ordersPerSlot: 3 },
  friday: { isOpen: true, riderCount: 2, ordersPerSlot: 5 },
  saturday: { isOpen: true, riderCount: 2, ordersPerSlot: 5 },
  sunday: { isOpen: true, riderCount: 2, ordersPerSlot: 5 }
}
```

Modificabile dal pannello settings.

### 15.2 Eccezioni: festività e chiusure

Tabella `tenant_schedule_exceptions`:

```typescript
interface ScheduleException {
  id: UUID
  tenantId: UUID
  date: Date // es. "2026-12-25"
  type: 'closed' | 'open' | 'modified'
  reason: string | null // "Natale", "Ferie"
  customConfig: DayConfig | null // se 'modified'
}
```

### 15.3 UI gestione

Calendario nel pannello settings:

- Vista mensile
- Click su giorno → modifica per quel giorno specifico
- Quick-add festività italiane (1 gen, 6 gen, 25 apr, 1 mag, 2 giu, 15 ago, 1 nov, 8 dic, 25 dic, 26 dic)
- Lista chiusure future visibili

### 15.4 Effetto sull'app cliente

Quando il cliente apre l'app:

- Se oggi chiuso (per giorno settimana o eccezione): banner rosso "Chiuso oggi"
- Se domani aperto: "Riapre domani alle 19:00"
- Disabilitazione bottoni ordine

---

## 16. Annullamento e rimborsi

### 16.1 Annullamento da cliente

Cliente può annullare il proprio ordine **solo entro 2 minuti** dalla conferma:

```typescript
async function customerCancelOrder(orderId: string, customerId: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.customerId, customerId)),
  })

  if (!order) throw new NotFoundError()
  if (order.status !== 'pending') {
    throw new InvalidStateError('Ordine già processato, non annullabile')
  }

  const timeSinceCreation = Date.now() - order.createdAt.getTime()
  if (timeSinceCreation > 2 * 60 * 1000) {
    throw new InvalidStateError('Tempo massimo per annullamento scaduto')
  }

  await db
    .update(orders)
    .set({
      status: 'cancelled',
      cancelledAt: new Date(),
      rejectionReason: 'cancelled_by_customer',
    })
    .where(eq(orders.id, orderId))

  await notifyOwnerOrderCancelled(orderId)
}
```

UI: pulsante "Annulla ordine" visibile solo per primi 2 minuti, con countdown.

### 16.2 Annullamento da titolare

Solo prima dell'accettazione (stato `pending`). Dopo accept, non può più annullare automaticamente (deve gestire telefonicamente con il cliente).

In casi estremi (es. emergenza), Stefano admin può annullare un ordine in qualsiasi stato.

### 16.3 Rimborsi (futuro Stripe)

Quando Stripe sarà attivo:

- Annullamento ordine con `paymentStatus: 'paid'` → rimborso automatico via Stripe API
- Aggiornamento `paymentStatus: 'refunded'`
- Notifica cliente: "Il tuo pagamento di X€ è stato rimborsato"

Per ora con cash on delivery: nessun rimborso necessario (non c'è stato incasso).

---

## 17. Pagamenti (predisposti, disattivati)

### 17.1 Feature flag

In `packages/shared/src/config/features.ts`:

```typescript
export const FEATURES = {
  stripeEnabled: process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'true',
  feedbackEnabled: process.env.NEXT_PUBLIC_FEEDBACK_ENABLED === 'true',
  // ...
}
```

UI checkout legge `FEATURES.stripeEnabled`:

- `false`: mostra solo "Pagamento alla consegna"
- `true`: mostra radio button entrambe le opzioni

### 17.2 Architettura Stripe Connect (predisposta)

Anche se disattivata, l'architettura è già pronta. In `packages/core/src/payments/`:

- `stripe-client.ts`: client Stripe configurato
- `create-payment-intent.ts`: crea PaymentIntent al checkout (se attivo)
- `webhook-handler.ts`: gestisce eventi Stripe (charge.succeeded, refund, ecc.)
- `connected-account-onboarding.ts`: onboarding KYC del tenant

Tutto il codice è scritto, ma le chiamate API a Stripe sono dentro `if (FEATURES.stripeEnabled)`.

### 17.3 Database predisposto

Tabella `orders` ha già:

- `payment_method: 'cash' | 'card'`
- `stripe_payment_intent_id: string | null`
- `stripe_charge_id: string | null`
- `payment_status: 'pending' | 'paid' | 'failed' | 'refunded'`

Tabella `tenants` ha:

- `stripe_account_id: string | null` (Connected Account ID)
- `stripe_onboarding_completed: boolean`

### 17.4 Attivazione futura

Quando Stefano vorrà attivare i pagamenti online:

1. Crea account Stripe per la piattaforma
2. Crea Connected Account Stripe per il tenant (la titolare)
3. La titolare completa KYC su Stripe
4. Setta variabili d'ambiente in produzione:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_ENABLED=true`
5. Redeploy
6. Stripe operativo

**Tempo stimato**: 1 settimana di lavoro + tempo KYC Stripe (variabile).

---

**Versione documento**: 1.0
**Data**: Maggio 2026
**Autore**: Stefano Colombini (CEO)
**Stato**: Approvato per inizio sviluppo
**Documenti correlati**: README.md, GITHUB_SETUP.md, MASTER_SPEC.md, DATABASE_SCHEMA.md
