'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { formatCurrency } from '@wormhole/shared'
import { fetchBoardAction, logoutAction, setPauseAction } from '@/app/actions'
import type { SerializedOrder } from '@/lib/serialize'
import { OrderCard } from '@/components/OrderCard'

const POLL_INTERVAL_MS = 12_000

interface Props {
  tenantName: string
  initialOrders: SerializedOrder[]
  initialPaused: boolean
}

interface Group {
  key: string
  title: string
  emoji: string
  orders: SerializedOrder[]
  highlight?: boolean
}

export function OrdersBoard({ tenantName, initialOrders, initialPaused }: Props) {
  const [ordersList, setOrdersList] = useState<SerializedOrder[]>(initialOrders)
  const [isPaused, setIsPaused] = useState(initialPaused)
  const [muted, setMuted] = useState(false)
  const [pollError, setPollError] = useState<string | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Suono allarme: 3 toni via WebAudio (nessun asset audio necessario).
  const playAlarm = useCallback(() => {
    try {
      audioCtxRef.current ??= new AudioContext()
      const ctx = audioCtxRef.current
      void ctx.resume()
      const t0 = ctx.currentTime
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.value = i % 2 === 0 ? 880 : 660
        gain.gain.setValueAtTime(0.0001, t0 + i * 0.35)
        gain.gain.exponentialRampToValueAtTime(0.3, t0 + i * 0.35 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.35 + 0.3)
        osc.connect(gain).connect(ctx.destination)
        osc.start(t0 + i * 0.35)
        osc.stop(t0 + i * 0.35 + 0.32)
      }
    } catch {
      // Audio bloccato dal browser finché l'utente non interagisce: pazienza.
    }
  }, [])

  const refresh = useCallback(async () => {
    const res = await fetchBoardAction()
    if (!res.success) {
      setPollError(res.error)
      return
    }
    setPollError(null)
    setOrdersList(res.data.orders)
    setIsPaused(res.data.isPaused)
  }, [])

  // Polling.
  useEffect(() => {
    const id = setInterval(() => void refresh(), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refresh])

  const pendingCount = ordersList.filter((o) => o.status === 'pending').length

  // Allarme ripetuto finché ci sono ordini pending (e non in mute).
  useEffect(() => {
    if (pendingCount === 0 || muted) return
    playAlarm()
    if ('vibrate' in navigator) navigator.vibrate?.([500, 200, 500])
    const id = setInterval(() => {
      playAlarm()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [pendingCount, muted, playAlarm])

  // Badge nel titolo della tab.
  useEffect(() => {
    document.title = pendingCount > 0 ? `(${pendingCount}) Nuovi ordini!` : 'Pannello Titolare'
  }, [pendingCount])

  const groups: Group[] = useMemo(() => {
    const by = (statuses: string[]) => ordersList.filter((o) => statuses.includes(o.status))
    return [
      { key: 'new', title: 'NUOVI', emoji: '📥', orders: by(['pending']), highlight: true },
      { key: 'prep', title: 'IN PREPARAZIONE', emoji: '👨‍🍳', orders: by(['accepted', 'preparing']) },
      { key: 'ready', title: 'PRONTI', emoji: '🛍️', orders: by(['ready']) },
      { key: 'delivery', title: 'IN CONSEGNA', emoji: '🚴', orders: by(['in_delivery']) },
      { key: 'done', title: 'CONSEGNATI OGGI', emoji: '✅', orders: by(['delivered']) },
      { key: 'cancelled', title: 'ANNULLATI OGGI', emoji: '❌', orders: by(['cancelled']) },
    ]
  }, [ordersList])

  // "Oggi: N ordini • €X" — esclude gli annullati dal fatturato.
  const todayStats = useMemo(() => {
    const valid = ordersList.filter((o) => o.status !== 'cancelled')
    const revenue = valid.reduce((sum, o) => sum + o.totalCents, 0)
    return { count: valid.length, revenue }
  }, [ordersList])

  async function togglePause() {
    const next = !isPaused
    setIsPaused(next) // ottimistico
    const res = await setPauseAction(next)
    if (!res.success) setIsPaused(!next)
  }

  return (
    <div className="bg-muted/30 min-h-screen pb-12">
      <header className="border-border bg-background sticky top-0 z-30 border-b">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{tenantName}</h1>
            <p className="text-muted-foreground text-xs">
              Oggi: {todayStats.count} ordini • {formatCurrency(todayStats.revenue)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="border-input hover:bg-accent rounded-md border px-2 py-1.5 text-sm"
              aria-label={muted ? 'Riattiva suono' : 'Silenzia'}
              title={muted ? 'Riattiva suono' : 'Silenzia allarme'}
            >
              {muted ? '🔇' : '🔔'}
            </button>
            <button
              type="button"
              onClick={() => void togglePause()}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                isPaused
                  ? 'border-destructive bg-destructive/10 text-destructive'
                  : 'border-input hover:bg-accent'
              }`}
            >
              {isPaused ? '⏸️ In pausa' : '▶️ Attivo'}
            </button>
          </div>
        </div>
        {isPaused ? (
          <p className="bg-destructive/10 text-destructive px-4 py-2 text-center text-sm font-medium">
            Ordini in pausa: i clienti vedono &quot;Temporaneamente non accettiamo ordini&quot;
          </p>
        ) : null}
        {pollError ? (
          <p className="bg-yellow-100 px-4 py-2 text-center text-sm text-yellow-900">{pollError}</p>
        ) : null}
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-4">
        {groups.map((g) =>
          g.orders.length === 0 && !g.highlight ? null : (
            <section key={g.key}>
              <h2 className="mb-2 text-sm font-bold tracking-wide">
                {g.emoji} {g.title} ({g.orders.length})
              </h2>
              {g.orders.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nessun ordine.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {g.orders.map((o) => (
                    <OrderCard key={o.id} order={o} onChanged={refresh} />
                  ))}
                </ul>
              )}
            </section>
          )
        )}

        <div className="flex items-center justify-between pt-4">
          <Link href={'/history' as Route} className="text-muted-foreground text-sm underline">
            Storico ordini
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-muted-foreground text-sm underline">
              Esci
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
