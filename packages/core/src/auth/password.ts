/**
 * Hashing password con scrypt (node:crypto) — nessuna dipendenza esterna.
 *
 * Formato stored: `scrypt$N$r$p$saltBase64$hashBase64`
 * I parametri sono salvati nel formato, quindi un futuro aumento dei costi
 * non invalida gli hash esistenti.
 *
 * Solo server-side (node:crypto): NON esportare da pacchetti bundlati client.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 32
const SALT_LENGTH = 16

export function hashPassword(plain: string): string {
  if (plain.length < 4) {
    throw new Error('Password troppo corta (minimo 4 caratteri)')
  }
  const salt = randomBytes(SALT_LENGTH)
  const hash = scryptSync(plain, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
  return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('base64'), hash.toString('base64')].join('$')
}

/**
 * Verifica una password contro un hash stored. Ritorna false (mai throw) per
 * hash malformati o password sbagliata — comodo nelle action di login.
 */
export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, nStr, rStr, pStr, saltB64, hashB64] = parts
  const N = Number(nStr)
  const r = Number(rStr)
  const p = Number(pStr)
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false
  try {
    const salt = Buffer.from(saltB64!, 'base64')
    const expected = Buffer.from(hashB64!, 'base64')
    const actual = scryptSync(plain, salt, expected.length, { N, r, p })
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
