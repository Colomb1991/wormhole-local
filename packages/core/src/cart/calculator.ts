import { DEFAULTS } from '@wormhole/shared'

export interface CartItem {
  menuItemId: string
  name: string
  unitPriceCents: number
  prepTimeMinutes: number
  quantity: number
}

export interface CartConfig {
  prepTimeBufferPerItem: number
  minOrderAmountCents: number
}

/**
 * Calcola subtotale del carrello in centesimi.
 *
 * @example
 *   calculateSubtotal([{ unitPriceCents: 550, quantity: 2, ... }])  // → 1100
 */
export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)
}

/**
 * Calcola il numero totale di pezzi nel carrello.
 */
export function countItems(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

/**
 * Tempo di preparazione totale del carrello.
 *
 * Formula (FEATURE_SPECS sez. 3.3):
 *   prepTime = MAX(tempi_singoli_piatti) + (numero_totale_pezzi * buffer_per_item)
 *
 * Esempi:
 *   - 1 spaghetti (5min)                  → 5 + 1*1 = 6 min
 *   - 1 spaghetti + 1 ravioli (5, 15)    → 15 + 2*1 = 17 min
 *   - 4 piatti misti, max 15min          → 15 + 4*1 = 19 min
 */
export function calculatePrepTime(items: CartItem[], config?: Partial<CartConfig>): number {
  if (items.length === 0) return 0
  const buffer = config?.prepTimeBufferPerItem ?? DEFAULTS.PREP_TIME_BUFFER_PER_ITEM_MIN
  const maxPrep = Math.max(...items.map((i) => i.prepTimeMinutes))
  const totalQty = countItems(items)
  return maxPrep + totalQty * buffer
}

// ---------------------------------------------------------------------------
// Validazione carrello
// ---------------------------------------------------------------------------

export type CartValidationResult =
  | { valid: true }
  | { valid: false; error: CartValidationError; message: string; missingCents?: number }

export type CartValidationError = 'EMPTY_CART' | 'BELOW_MIN_ORDER' | 'INVALID_QUANTITY'

/**
 * Valida il carrello rispetto alle regole del tenant.
 */
export function validateCart(items: CartItem[], config: CartConfig): CartValidationResult {
  if (items.length === 0) {
    return { valid: false, error: 'EMPTY_CART', message: 'Carrello vuoto' }
  }

  if (items.some((i) => i.quantity <= 0 || !Number.isInteger(i.quantity))) {
    return {
      valid: false,
      error: 'INVALID_QUANTITY',
      message: 'Quantità non valida per uno o più piatti',
    }
  }

  const subtotal = calculateSubtotal(items)
  if (subtotal < config.minOrderAmountCents) {
    const missing = config.minOrderAmountCents - subtotal
    return {
      valid: false,
      error: 'BELOW_MIN_ORDER',
      missingCents: missing,
      message: `Ordine minimo ${(config.minOrderAmountCents / 100).toFixed(2)}€ — mancano ${(missing / 100).toFixed(2)}€`,
    }
  }

  return { valid: true }
}

// ---------------------------------------------------------------------------
// Calcolo resto contanti
// ---------------------------------------------------------------------------

export type ChangeCalcResult =
  | { valid: true; changeCents: number }
  | { valid: false; error: 'INSUFFICIENT' | 'EXCEEDS_MAX'; message: string }

export function calculateCashChange(
  totalCents: number,
  payingWithCents: number,
  maxChangeCents: number
): ChangeCalcResult {
  if (payingWithCents < totalCents) {
    return {
      valid: false,
      error: 'INSUFFICIENT',
      message: 'Importo inferiore al totale ordine',
    }
  }
  const change = payingWithCents - totalCents
  if (change > maxChangeCents) {
    return {
      valid: false,
      error: 'EXCEEDS_MAX',
      message: `Il rider può dare massimo ${(maxChangeCents / 100).toFixed(2)}€ di resto`,
    }
  }
  return { valid: true, changeCents: change }
}
