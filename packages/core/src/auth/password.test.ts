import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('hashPassword / verifyPassword', () => {
  it('roundtrip: hash e verifica', () => {
    const stored = hashPassword('almare2026')
    expect(stored.startsWith('scrypt$')).toBe(true)
    expect(verifyPassword('almare2026', stored)).toBe(true)
  })

  it('password sbagliata → false', () => {
    const stored = hashPassword('almare2026')
    expect(verifyPassword('sbagliata', stored)).toBe(false)
  })

  it('due hash della stessa password sono diversi (salt casuale)', () => {
    expect(hashPassword('x'.repeat(8))).not.toBe(hashPassword('x'.repeat(8)))
  })

  it('non lancia mai su input malformati', () => {
    expect(verifyPassword('x', null)).toBe(false)
    expect(verifyPassword('x', undefined)).toBe(false)
    expect(verifyPassword('x', '')).toBe(false)
    expect(verifyPassword('x', 'bcrypt$qualcosa')).toBe(false)
    expect(verifyPassword('x', 'scrypt$NaN$8$1$!!!$???')).toBe(false)
  })

  it('rifiuta password troppo corte in hash', () => {
    expect(() => hashPassword('abc')).toThrow()
  })
})
