'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { useCartStore } from '@/lib/cart-store'
import {
  calculateSubtotal,
  calculatePrepTime,
  countItems,
  calculateCashChange,
} from '@wormhole/core'
import { formatCurrency, formatTime } from '@wormhole/shared'
import { Button, Input } from '@wormhole/ui'
import {
  getSlotsAction,
  createOrderAction,
  type SerializedSlot,
} from '@/app/r/[tenantSlug]/checkout/actions'

export interface CapOption {
  postalCode: string
  city: string
  deliveryFeeCents: number
}

interface Prefill {
  street: string
  buildingNumber: string
  postalCode: string
  notes: string
}

interface Props {
  tenantSlug: string
  servedCaps: CapOption[]
  minOrderAmountCents: number
  prepTimeBufferPerItem: number
  maxCashChangeCents: number
  prefill: Prefill
}

/** "30" / "30,50" → centesimi; vuoto → null. */
function parseEurosToCents(input: string): number | null {
  const trimmed = input.trim().replace(',', '.')
  if (trimmed === '') return null
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

export function CheckoutFlow({
  tenantSlug,
  servedCaps,
  minOrderAmountCents,
  prepTimeBufferPerItem,
  maxCashChangeCents,
  prefill,
}: Props) {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clear)

  const [mounted, setMounted] = useState(false)
  const [street, setStreet] = useState(prefill.street)
  const [buildingNumber, setBuildingNumber] = useState(prefill.buildingNumber)
  const [postalCode, setPostalCode] = useState(
    prefill.postalCode || servedCaps[0]?.postalCode || ''
  )
  const [notes, setNotes] = useState(prefill.notes)
  const [payingWith, setPayingWith] = useState('')

  const [slots, setSlots] = useState<SerializedSlot[]>([])
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null)
  const [loadingSlots, startSlots] = useTransition()

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, startSubmit] = useTransition()

  useEffect(() => setMounted(true), [])

  const menuHref = `/r/${tenantSlug}/menu` as Route

  const subtotal = calculateSubtotal(items)
  const cartPrepTime = calculatePrepTime(items, { prepTimeBufferPerItem })
  const selectedCap = servedCaps.find((c) => c.postalCode === postalCode)
  const deliveryFee = selectedCap?.deliveryFeeCents ?? 0
  const total = subtotal + deliveryFee

  // Carica slot al cambio di CAP (e al primo mount con carrello).
  useEffect(() => {
    if (!mounted || countItems(items) === 0 || !postalCode) return
    setSelectedSlotIso(null)
    setSlotsError(null)
    startSlots(async () => {
      const res = await getSlotsAction({ tenantSlug, postalCode, cartPrepTimeMinutes: cartPrepTime })
      if (!res.success) {
        setSlots([])
        setSlotsError(res.error)
        return
      }
      setSlots(res.data.slots)
      const recommended = res.data.slots.find((s) => s.isRecommended) ?? res.data.slots[0]
      if (recommended) setSelectedSlotIso(recommended.startTimeIso)
    })
  }, [mounted, postalCode, cartPrepTime])

  if (mounted && countItems(items) === 0) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-lg font-medium">Il carrello è vuoto</p>
        <Button onClick={() => router.push(menuHref)}>Vai al menu</Button>
      </div>
    )
  }

  const payingWithCents = parseEurosToCents(payingWith)
  let changePreview: string | null = null
  let changeError: string | null = null
  if (payingWithCents != null) {
    const change = calculateCashChange(total, payingWithCents, maxCashChangeCents)
    if (change.valid) changePreview = formatCurrency(change.changeCents)
    else changeError = change.message
  }

  const canSubmit =
    mounted &&
    !submitting &&
    subtotal >= minOrderAmountCents &&
    street.trim().length >= 3 &&
    !!postalCode &&
    !!selectedSlotIso &&
    !changeError

  function handleSubmit() {
    if (!selectedSlotIso) return
    setSubmitError(null)
    startSubmit(async () => {
      const res = await createOrderAction({
        tenantSlug,
        items,
        address: {
          street,
          postalCode,
          city: selectedCap?.city ?? 'Livorno',
          buildingNumber: buildingNumber.trim() || null,
          notes: notes.trim() || null,
        },
        scheduledSlotIso: selectedSlotIso,
        customerPayingWithCents: payingWithCents,
        customerNotes: notes.trim() || null,
      })
      if (!res.success) {
        setSubmitError(res.error)
        return
      }
      clearCart()
      router.push(`/r/${tenantSlug}/orders/${res.data.orderId}/confirmed` as Route)
    })
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      {/* 1. Riepilogo */}
      <Section title="Riepilogo ordine">
        <ul className="flex flex-col gap-1 text-sm">
          {items.map((i) => (
            <li key={i.menuItemId} className="flex justify-between">
              <span>
                {i.quantity}× {i.name}
              </span>
              <span>{formatCurrency(i.unitPriceCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="border-border mt-3 flex flex-col gap-1 border-t pt-3 text-sm">
          <Row label="Subtotale" value={formatCurrency(subtotal)} />
          <Row label={`Consegna (${postalCode || '—'})`} value={formatCurrency(deliveryFee)} />
          <Row label="Totale" value={formatCurrency(total)} bold />
          <p className="text-muted-foreground text-xs">Tempo di preparazione: {cartPrepTime} min</p>
        </div>
      </Section>

      {/* 2. Indirizzo */}
      <Section title="Indirizzo di consegna">
        <div className="flex flex-col gap-3">
          <Input
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="Via e nome della strada"
            autoComplete="address-line1"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              value={buildingNumber}
              onChange={(e) => setBuildingNumber(e.target.value)}
              placeholder="Civico"
            />
            <select
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="border-input bg-background focus-visible:ring-ring h-12 w-full rounded-md border px-3 text-base focus-visible:outline-none focus-visible:ring-2"
            >
              {servedCaps.map((c) => (
                <option key={c.postalCode} value={c.postalCode}>
                  {c.postalCode} — {formatCurrency(c.deliveryFeeCents)}
                </option>
              ))}
            </select>
          </div>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Note (es. citofono, piano)"
          />
        </div>
      </Section>

      {/* 3. Orario */}
      <Section title="Quando vuoi riceverlo">
        {loadingSlots ? (
          <p className="text-muted-foreground text-sm">Calcolo gli orari disponibili…</p>
        ) : slotsError ? (
          <p className="text-destructive text-sm">{slotsError}</p>
        ) : slots.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nessuno slot disponibile al momento. Riprova più tardi.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {slots.map((slot) => {
              const selected = slot.startTimeIso === selectedSlotIso
              return (
                <li key={slot.startTimeIso}>
                  <button
                    type="button"
                    onClick={() => setSelectedSlotIso(slot.startTimeIso)}
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                      selected
                        ? 'border-[var(--color-primary)] bg-primary/10'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <span className="font-medium">{formatTime(slot.startTimeIso)}</span>
                    {slot.isRecommended ? (
                      <span className="text-primary text-xs font-semibold">Consigliato</span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {/* 4. Pagamento */}
      <Section title="Pagamento">
        <p className="text-sm font-medium">💵 Pagamento alla consegna (contanti)</p>
        <div className="mt-3 flex flex-col gap-1.5">
          <label htmlFor="payingWith" className="text-sm">
            Hai bisogno di resto? Con quanto paghi? (opzionale)
          </label>
          <Input
            id="payingWith"
            inputMode="decimal"
            value={payingWith}
            onChange={(e) => setPayingWith(e.target.value)}
            placeholder={`es. ${(total / 100).toFixed(0)}`}
          />
          {changePreview ? (
            <p className="text-muted-foreground text-sm">Resto da ricevere: {changePreview}</p>
          ) : null}
          {changeError ? <p className="text-destructive text-sm">{changeError}</p> : null}
        </div>
      </Section>

      {subtotal < minOrderAmountCents ? (
        <p className="bg-yellow-100 text-yellow-900 rounded-lg px-4 py-3 text-sm">
          Ordine minimo {formatCurrency(minOrderAmountCents)}.
        </p>
      ) : null}
      {submitError ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {submitError}
        </p>
      ) : null}

      <Button size="lg" className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
        {submitting ? 'Invio ordine…' : `Conferma ordine • ${formatCurrency(total)}`}
      </Button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-border bg-background rounded-xl border p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'text-base font-bold' : ''}`}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
