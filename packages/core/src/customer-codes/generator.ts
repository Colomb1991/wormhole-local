/**
 * Generazione codice univoco di consegna 4 cifre per cliente.
 *
 * Separato in due funzioni:
 *  - `generateRandomCode()` — pura, randomica, testabile
 *  - `generateUniqueCustomerCode()` — con check di unicità contro DB
 */

const MAX_ATTEMPTS_4_DIGITS = 10

/**
 * Genera un codice random a 4 cifre [1000-9999].
 */
export function generateRandomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

/**
 * Genera un codice random a 5 cifre [10000-99999], usato come fallback
 * quando dopo molti tentativi un codice a 4 cifre risulta sempre occupato.
 */
export function generateRandomCode5(): string {
  return Math.floor(10000 + Math.random() * 90000).toString()
}

/**
 * Genera un codice univoco per il tenant. Riceve come dipendenza una
 * funzione `codeExists` che verifica se un codice è già preso — questo
 * permette di testare la logica senza toccare il DB.
 *
 * @example
 *   const code = await generateUniqueCustomerCode(async (c) => {
 *     return await db.query.customers.findFirst({...}) !== null
 *   })
 */
export async function generateUniqueCustomerCode(
  codeExists: (code: string) => Promise<boolean>
): Promise<string> {
  for (let i = 0; i < MAX_ATTEMPTS_4_DIGITS; i++) {
    const code = generateRandomCode()
    if (!(await codeExists(code))) {
      return code
    }
  }
  // Fallback estremamente raro a scala normale: passa a 5 cifre
  for (let i = 0; i < MAX_ATTEMPTS_4_DIGITS; i++) {
    const code = generateRandomCode5()
    if (!(await codeExists(code))) {
      return code
    }
  }
  throw new Error('Could not generate unique customer code after retries')
}
