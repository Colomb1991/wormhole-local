'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { Button, Input } from '@wormhole/ui'
import { formatCurrency, formatPhoneDisplay } from '@wormhole/shared'
import { identifyCustomerAction, registerCustomerAction } from '@/app/r/[tenantSlug]/actions'

export interface ServedCapOption {
  postalCode: string
  city: string
  deliveryFeeCents: number
}

interface Props {
  tenantSlug: string
  servedCaps: ServedCapOption[]
}

type Step = 'phone' | 'register' | 'done'

interface DoneState {
  title: string
  name: string | null
  deliveryCode: string
}

export function OnboardingFlow({ tenantSlug, servedCaps }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<Step>('phone')
  const [error, setError] = useState<string | null>(null)

  // step phone
  const [phoneInput, setPhoneInput] = useState('')
  // step register — telefono normalizzato dallo step precedente
  const [normalizedPhone, setNormalizedPhone] = useState('')
  // step done
  const [done, setDone] = useState<DoneState | null>(null)

  const menuHref = `/r/${tenantSlug}/menu` as Route

  function goToMenu() {
    startTransition(() => router.push(menuHref))
  }

  function submitPhone(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await identifyCustomerAction({ tenantSlug, phone: phoneInput })
      if (!res.success) {
        setError(res.error)
        return
      }
      if (res.data.found) {
        setDone({
          title: `Bentornato, ${res.data.name}!`,
          name: res.data.name,
          deliveryCode: res.data.deliveryCode,
        })
        setStep('done')
      } else {
        setNormalizedPhone(res.data.phone)
        setStep('register')
      }
    })
  }

  if (step === 'phone') {
    return (
      <FormCard
        title="Inserisci il tuo telefono"
        subtitle="Lo usiamo per riconoscerti e per la consegna."
      >
        <form onSubmit={submitPhone} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-sm font-medium">
              Numero di telefono
            </label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="es. 333 1234567"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              autoFocus
              required
            />
            <p className="text-muted-foreground text-xs">Prefisso +39 applicato automaticamente.</p>
          </div>
          <ErrorText error={error} />
          <Button type="submit" size="lg" disabled={isPending || phoneInput.trim().length < 6}>
            {isPending ? 'Attendi…' : 'Continua'}
          </Button>
        </form>
      </FormCard>
    )
  }

  if (step === 'register') {
    return (
      <RegisterStep
        tenantSlug={tenantSlug}
        phone={normalizedPhone}
        servedCaps={servedCaps}
        isPending={isPending}
        error={error}
        onBack={() => {
          setError(null)
          setStep('phone')
        }}
        onSubmit={(payload) => {
          setError(null)
          startTransition(async () => {
            const res = await registerCustomerAction(payload)
            if (!res.success) {
              setError(res.error)
              return
            }
            setDone({
              title: res.data.isExisting ? 'Bentornato!' : 'Profilo creato!',
              name: payload.name,
              deliveryCode: res.data.deliveryCode,
            })
            setStep('done')
          })
        }}
      />
    )
  }

  // step done
  return (
    <FormCard title={done?.title ?? 'Tutto pronto!'}>
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="w-full">
          <p className="text-muted-foreground text-sm">Il tuo codice di consegna</p>
          <p
            className="text-primary mt-1 font-mono text-5xl font-bold tracking-widest"
            aria-label={`Codice di consegna ${done?.deliveryCode ?? ''}`}
          >
            {done?.deliveryCode}
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            Il rider te lo chiederà alla consegna. Lo trovi sempre nel tuo profilo.
          </p>
        </div>
        <Button size="lg" className="w-full" onClick={goToMenu} disabled={isPending}>
          {isPending ? 'Attendi…' : 'Vai al menu'}
        </Button>
      </div>
    </FormCard>
  )
}

// ---------------------------------------------------------------------------
// Step registrazione (cliente nuovo)
// ---------------------------------------------------------------------------

interface RegisterPayload {
  tenantSlug: string
  phone: string
  name: string
  email?: string
  address: {
    street: string
    postalCode: string
    city: string
    buildingNumber?: string | null
    notes?: string | null
  }
  hasConsentedDataStorage: boolean
}

function RegisterStep({
  tenantSlug,
  phone,
  servedCaps,
  isPending,
  error,
  onBack,
  onSubmit,
}: {
  tenantSlug: string
  phone: string
  servedCaps: ServedCapOption[]
  isPending: boolean
  error: string | null
  onBack: () => void
  onSubmit: (payload: RegisterPayload) => void
}) {
  const [name, setName] = useState('')
  const [street, setStreet] = useState('')
  const [buildingNumber, setBuildingNumber] = useState('')
  const [postalCode, setPostalCode] = useState(servedCaps[0]?.postalCode ?? '')
  const [notes, setNotes] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)

  const selectedCap = servedCaps.find((c) => c.postalCode === postalCode)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (name.trim().length < 2) {
      setLocalError('Inserisci il tuo nome (almeno 2 caratteri)')
      return
    }
    if (street.trim().length < 3) {
      setLocalError('Inserisci un indirizzo valido')
      return
    }
    if (!postalCode) {
      setLocalError('Seleziona il CAP di consegna')
      return
    }
    onSubmit({
      tenantSlug,
      phone,
      name,
      email: email.trim() || undefined,
      address: {
        street,
        postalCode,
        city: selectedCap?.city ?? 'Livorno',
        buildingNumber: buildingNumber.trim() || null,
        notes: notes.trim() || null,
      },
      hasConsentedDataStorage: consent,
    })
  }

  return (
    <FormCard
      title="Crea il tuo profilo"
      subtitle={`Telefono: ${formatPhoneDisplay(phone)}`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nome" htmlFor="name">
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mario Bianchi"
            autoComplete="name"
            autoFocus
            required
          />
        </Field>

        <Field label="Indirizzo di consegna" htmlFor="street">
          <Input
            id="street"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="Via e nome della strada"
            autoComplete="address-line1"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Civico" htmlFor="civic">
            <Input
              id="civic"
              value={buildingNumber}
              onChange={(e) => setBuildingNumber(e.target.value)}
              placeholder="15"
            />
          </Field>
          <Field label="CAP" htmlFor="cap">
            <select
              id="cap"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="border-input bg-background focus-visible:ring-ring focus-visible:border-ring h-12 w-full rounded-md border px-3 text-base focus-visible:outline-none focus-visible:ring-2"
              required
            >
              {servedCaps.map((cap) => (
                <option key={cap.postalCode} value={cap.postalCode}>
                  {cap.postalCode} — {formatCurrency(cap.deliveryFeeCents)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Note di consegna (opzionale)" htmlFor="notes">
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="es. citofono Bianchi, 2º piano"
          />
        </Field>

        <Field label="Email (opzionale)" htmlFor="email">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="per ricevere la conferma d'ordine"
            autoComplete="email"
          />
        </Field>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span className="text-muted-foreground">
            Salva i miei dati per ordini futuri. I dati restano privati e visibili solo al
            ristorante (GDPR).
          </span>
        </label>

        <ErrorText error={localError ?? error} />

        <div className="flex gap-3">
          <Button type="button" variant="outline" size="lg" onClick={onBack} disabled={isPending}>
            Indietro
          </Button>
          <Button type="submit" size="lg" className="flex-1" disabled={isPending}>
            {isPending ? 'Attendi…' : 'Crea profilo e ordina'}
          </Button>
        </div>
      </form>
    </FormCard>
  )
}

// ---------------------------------------------------------------------------
// Primitivi di layout locali
// ---------------------------------------------------------------------------

function FormCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="border-border bg-background mx-auto w-full max-w-md rounded-2xl border p-6 shadow-sm">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle ? <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  )
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p role="alert" className="text-destructive text-sm">
      {error}
    </p>
  )
}
