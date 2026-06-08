import { z } from 'zod'
import { ORDER_STATUSES, PAYMENT_METHODS } from '../constants/index'

// ---------------------------------------------------------------------------
// Telefono italiano normalizzato (E.164)
// ---------------------------------------------------------------------------
export const phoneSchema = z
  .string()
  .regex(/^\+39\d{9,10}$/, 'Numero di telefono non valido (atteso +39 seguito da 9-10 cifre)')

// ---------------------------------------------------------------------------
// CAP italiano (5 cifre)
// ---------------------------------------------------------------------------
export const postalCodeSchema = z.string().regex(/^\d{5}$/, 'CAP non valido (atteso 5 cifre)')

// ---------------------------------------------------------------------------
// Codice consegna 4 cifre
// ---------------------------------------------------------------------------
export const deliveryCodeSchema = z.string().regex(/^\d{4,5}$/, 'Codice consegna non valido')

// ---------------------------------------------------------------------------
// Indirizzo
// ---------------------------------------------------------------------------
export const addressSchema = z.object({
  street: z.string().min(3, 'Indirizzo troppo corto').max(255),
  postalCode: postalCodeSchema,
  city: z.string().min(2).max(100),
  buildingNumber: z.string().max(20).nullable().optional(),
  floor: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export type AddressInput = z.infer<typeof addressSchema>

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------
export const customerRegistrationSchema = z.object({
  phone: phoneSchema,
  name: z.string().min(2, 'Nome troppo corto').max(255),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  address: addressSchema,
  hasConsentedDataStorage: z.boolean(),
})

export type CustomerRegistrationInput = z.infer<typeof customerRegistrationSchema>

// ---------------------------------------------------------------------------
// Cart item input (lato client)
// ---------------------------------------------------------------------------
export const cartItemSchema = z.object({
  menuItemId: z.string().uuid(),
  name: z.string(),
  unitPriceCents: z.number().int().nonnegative(),
  prepTimeMinutes: z.number().int().nonnegative(),
  quantity: z.number().int().positive().max(99),
})

export type CartItemInput = z.infer<typeof cartItemSchema>

// ---------------------------------------------------------------------------
// Creazione ordine
// ---------------------------------------------------------------------------
export const createOrderSchema = z.object({
  tenantId: z.string().uuid(),
  items: z.array(cartItemSchema).min(1, 'Carrello vuoto'),
  address: addressSchema,
  scheduledSlot: z.string().datetime(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  customerPayingWithCents: z.number().int().positive().optional().nullable(),
  customerNotes: z.string().max(500).optional().nullable(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

// ---------------------------------------------------------------------------
// Update stato ordine (titolare)
// ---------------------------------------------------------------------------
export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
  reason: z.string().max(500).optional(),
})

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------
export const feedbackSchema = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
})

export type FeedbackInput = z.infer<typeof feedbackSchema>

// ---------------------------------------------------------------------------
// Menu item (admin/titolare)
// ---------------------------------------------------------------------------
export const menuItemUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid().nullable(),
  name: z.string().min(2).max(255),
  description: z.string().max(1000).nullable().optional(),
  priceCents: z.number().int().nonnegative(),
  vatRate: z.union([z.literal(10), z.literal(22)]),
  prepTimeMinutes: z.number().int().min(1).max(120),
  isAvailable: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
})

export type MenuItemUpsertInput = z.infer<typeof menuItemUpsertSchema>
