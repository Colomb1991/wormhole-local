/**
 * Logica pura di onboarding cliente (FEATURE_SPECS sez. 1).
 *
 * Niente I/O qui: normalizzazione input, costruzione del payload di
 * inserimento customer. Le query e la generazione del codice univoco contro il
 * DB stanno sopra il chiamante (app/lib + `generateUniqueCustomerCode`).
 */
import { normalizePhone } from '@wormhole/shared'
import type { AddressInput } from '@wormhole/shared'

/**
 * Normalizza un'email opzionale: stringa vuota o assente → null, altrimenti
 * trim + lowercase.
 */
export function normalizeCustomerEmail(email?: string | null): string | null {
  if (!email) return null
  const trimmed = email.trim()
  return trimmed === '' ? null : trimmed.toLowerCase()
}

export type PhoneParseResult =
  | { ok: true; phone: string }
  | { ok: false; error: string }

/**
 * Tenta di normalizzare un numero di telefono in E.164 senza lanciare
 * eccezioni: comodo per le Server Action (no-throw style).
 */
export function tryNormalizePhone(raw: string): PhoneParseResult {
  try {
    return { ok: true, phone: normalizePhone(raw) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Numero non valido' }
  }
}

export interface BuildCustomerInsertParams {
  tenantId: string
  /** Telefono già normalizzato in E.164. */
  phone: string
  name: string
  email?: string | null
  address: AddressInput
  hasConsentedDataStorage: boolean
  deliveryCode: string
  /** Iniettabile per testabilità. Default: ora corrente. */
  now?: Date
}

export interface CustomerInsertValues {
  tenantId: string
  phone: string
  name: string
  email: string | null
  deliveryCode: string
  defaultAddress: {
    street: string
    postalCode: string
    city: string
    buildingNumber: string | null
    floor: string | null
    notes: string | null
  }
  hasConsentedDataStorage: boolean
  consentGivenAt: Date | null
}

/**
 * Costruisce i valori di inserimento di un nuovo customer a partire dai dati
 * di registrazione validati. `consentGivenAt` è valorizzato solo se l'utente
 * ha effettivamente acconsentito alla conservazione dei dati (GDPR).
 */
export function buildCustomerInsert(params: BuildCustomerInsertParams): CustomerInsertValues {
  const now = params.now ?? new Date()
  return {
    tenantId: params.tenantId,
    phone: params.phone,
    name: params.name.trim(),
    email: normalizeCustomerEmail(params.email),
    deliveryCode: params.deliveryCode,
    defaultAddress: {
      street: params.address.street.trim(),
      postalCode: params.address.postalCode,
      city: params.address.city.trim(),
      buildingNumber: params.address.buildingNumber?.trim() || null,
      floor: params.address.floor?.trim() || null,
      notes: params.address.notes?.trim() || null,
    },
    hasConsentedDataStorage: params.hasConsentedDataStorage,
    consentGivenAt: params.hasConsentedDataStorage ? now : null,
  }
}
