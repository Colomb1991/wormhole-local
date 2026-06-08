/**
 * Normalizza un numero di telefono italiano in formato E.164.
 *
 * Esempi:
 *   "333 1234567"      → "+393331234567"
 *   "3331234567"       → "+393331234567"
 *   "+39 333 1234567"  → "+393331234567"
 *   "0039 333 1234567" → "+393331234567"
 *
 * @throws Error se il numero non è valido o non è italiano.
 */
export function normalizePhone(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid phone input')
  }

  // Rimuovi spazi, trattini, punti, parentesi
  let cleaned = input.replace(/[\s\-.()]/g, '')

  // 00... → +...
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2)
  }

  // Se inizia con +, deve essere +39 per cellulare italiano
  if (cleaned.startsWith('+')) {
    if (!cleaned.startsWith('+39')) {
      throw new Error(`Non-Italian phone number: ${input}`)
    }
    // Validazione lunghezza: +39 + 9 o 10 cifre = 12 o 13 char totali
    if (cleaned.length < 12 || cleaned.length > 13) {
      throw new Error(`Invalid Italian phone length: ${input}`)
    }
    return cleaned
  }

  // Numero italiano senza prefisso, deve iniziare con 3 (cellulare)
  if (cleaned.startsWith('3') && (cleaned.length === 9 || cleaned.length === 10)) {
    return '+39' + cleaned
  }

  throw new Error(`Invalid phone format: ${input}`)
}

/**
 * Formatta un numero E.164 per display utente (con spazi).
 *
 * @example formatPhoneDisplay("+393331234567") // "+39 333 1234567"
 */
export function formatPhoneDisplay(e164: string): string {
  if (!e164.startsWith('+39')) return e164
  const local = e164.slice(3)
  if (local.length === 10) {
    return `+39 ${local.slice(0, 3)} ${local.slice(3)}`
  }
  if (local.length === 9) {
    return `+39 ${local.slice(0, 3)} ${local.slice(3)}`
  }
  return e164
}
