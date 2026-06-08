/**
 * Tipi condivisi tra app e package. Tipi DB-derivati stanno in `@wormhole/database`.
 */

// ---------------------------------------------------------------------------
// Errori applicativi tipati
// ---------------------------------------------------------------------------

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Non autenticato') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Operazione non consentita') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Risorsa non trovata') {
    super(message, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fields?: Record<string, string[]>
  ) {
    super(message, 'VALIDATION_ERROR', 400)
    this.name = 'ValidationError'
  }
}

export class InvalidStateError extends AppError {
  constructor(message: string) {
    super(message, 'INVALID_STATE', 409)
    this.name = 'InvalidStateError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409)
    this.name = 'ConflictError'
  }
}

export class SlotUnavailableError extends AppError {
  constructor(public readonly reason: string) {
    super(`Slot non disponibile: ${reason}`, 'SLOT_UNAVAILABLE', 409)
    this.name = 'SlotUnavailableError'
  }
}

// ---------------------------------------------------------------------------
// Result types per Server Actions (no-throw style)
// ---------------------------------------------------------------------------

export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E; code?: string }

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data }
}

export function err<E = string>(error: E, code?: string): Result<never, E> {
  return { success: false, error, code }
}

// ---------------------------------------------------------------------------
// Tipi geo
// ---------------------------------------------------------------------------

export interface Coordinates {
  lat: number
  lon: number
}
