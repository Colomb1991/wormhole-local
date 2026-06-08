/**
 * Costruisce la matrice distanze CAP per un tenant.
 *
 * Steps:
 *  1. Carica i CAP serviti dal tenant
 *  2. Per ogni CAP senza coordinate: geocode via Nominatim (OpenStreetMap)
 *  3. Calcola distanze (km, linea d'aria) tra ristorante e ogni CAP
 *  4. Calcola matrice distanze tra ogni coppia di CAP serviti
 *  5. Salva tutto nelle tabelle `tenant_postal_codes` e `cap_distance_matrix`
 *
 * Uso:
 *   pnpm build:distance-matrix <tenant-slug>
 *   pnpm build:distance-matrix cinese-usdt
 *
 * Nominatim ha un rate limit di 1 req/sec. Lo script rispetta questa policy.
 */
import 'dotenv/config'
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { eq, and } from 'drizzle-orm'

config({ path: resolve(process.cwd(), '.env.local') })

const { db, tenants, tenantPostalCodes, capDistanceMatrix } =
  await import('../packages/database/src/index')
const { haversineDistance } = await import('../packages/core/src/delivery/haversine')

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'WormholeLocal/0.0.1 (https://github.com/Colomb1991/wormhole-local)'
const RATE_LIMIT_MS = 1100 // safe margin over 1 req/sec

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

interface NominatimResult {
  lat: string
  lon: string
}

async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=it`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) {
    console.warn(`  ⚠️  Nominatim returned ${res.status} for "${query}"`)
    return null
  }
  const data = (await res.json()) as NominatimResult[]
  if (data.length === 0) {
    console.warn(`  ⚠️  No results for "${query}"`)
    return null
  }
  const first = data[0]!
  return { lat: parseFloat(first.lat), lon: parseFloat(first.lon) }
}

async function main() {
  const slug = process.argv[2]
  if (!slug) {
    console.error('Usage: pnpm build:distance-matrix <tenant-slug>')
    process.exit(1)
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) })
  if (!tenant) {
    console.error(`Tenant "${slug}" not found`)
    process.exit(1)
  }
  console.info(`📍 Building distance matrix for tenant "${tenant.name}" (${tenant.id})`)

  // Geocoda ristorante se manca
  if (!tenant.latitude || !tenant.longitude) {
    console.info('  Geocoding restaurant address...')
    const coords = await geocode(`${tenant.address}, ${tenant.postalCode} ${tenant.city}, Italia`)
    if (!coords) throw new Error('Failed to geocode restaurant address')
    await db
      .update(tenants)
      .set({ latitude: coords.lat.toString(), longitude: coords.lon.toString() })
      .where(eq(tenants.id, tenant.id))
    tenant.latitude = coords.lat.toString()
    tenant.longitude = coords.lon.toString()
    console.info(`  ✓ Restaurant @ ${coords.lat}, ${coords.lon}`)
    await sleep(RATE_LIMIT_MS)
  }

  const restaurantCoords = {
    lat: parseFloat(tenant.latitude!),
    lon: parseFloat(tenant.longitude!),
  }

  // Carica CAP serviti
  const caps = await db.query.tenantPostalCodes.findMany({
    where: and(eq(tenantPostalCodes.tenantId, tenant.id), eq(tenantPostalCodes.isServed, true)),
  })
  console.info(`  Found ${caps.length} served postal codes`)

  // Geocoda CAP senza coords
  for (const cap of caps) {
    if (cap.latitude && cap.longitude) continue
    console.info(`  Geocoding ${cap.postalCode}...`)
    const coords = await geocode(`${cap.postalCode} ${cap.city}, Italia`)
    if (!coords) {
      console.warn(`  ⚠️  Could not geocode ${cap.postalCode}, skipping`)
      continue
    }
    cap.latitude = coords.lat.toString()
    cap.longitude = coords.lon.toString()

    const km = haversineDistance(restaurantCoords, coords)
    cap.distanceFromRestaurantKm = km.toFixed(3)

    await db
      .update(tenantPostalCodes)
      .set({
        latitude: cap.latitude,
        longitude: cap.longitude,
        distanceFromRestaurantKm: cap.distanceFromRestaurantKm,
      })
      .where(eq(tenantPostalCodes.id, cap.id))

    console.info(`  ✓ ${cap.postalCode} @ ${coords.lat}, ${coords.lon} (${km.toFixed(2)} km)`)
    await sleep(RATE_LIMIT_MS)
  }

  // Aggiorna distanze ristorante per CAP che avevano già coords
  for (const cap of caps) {
    if (!cap.latitude || !cap.longitude || cap.distanceFromRestaurantKm) continue
    const km = haversineDistance(restaurantCoords, {
      lat: parseFloat(cap.latitude),
      lon: parseFloat(cap.longitude),
    })
    await db
      .update(tenantPostalCodes)
      .set({ distanceFromRestaurantKm: km.toFixed(3) })
      .where(eq(tenantPostalCodes.id, cap.id))
  }

  // Matrice CAP-CAP (coppie uniche, capA < capB)
  console.info('  Building CAP-CAP matrix...')
  const sortedCaps = [...caps]
    .filter((c) => c.latitude && c.longitude)
    .sort((a, b) => a.postalCode.localeCompare(b.postalCode))

  let inserted = 0
  for (let i = 0; i < sortedCaps.length; i++) {
    for (let j = i + 1; j < sortedCaps.length; j++) {
      const a = sortedCaps[i]!
      const b = sortedCaps[j]!
      const km = haversineDistance(
        { lat: parseFloat(a.latitude!), lon: parseFloat(a.longitude!) },
        { lat: parseFloat(b.latitude!), lon: parseFloat(b.longitude!) }
      )
      await db
        .insert(capDistanceMatrix)
        .values({
          tenantId: tenant.id,
          capA: a.postalCode,
          capB: b.postalCode,
          distanceKm: km.toFixed(3),
        })
        .onConflictDoNothing()
      inserted++
    }
  }

  console.info(`✅ Done. ${inserted} CAP-CAP pairs in matrix.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Distance matrix build failed:', err)
  process.exit(1)
})
