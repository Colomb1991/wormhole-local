import { describe, it, expect } from 'vitest'
import {
  normalizeCustomerEmail,
  tryNormalizePhone,
  buildCustomerInsert,
} from './onboarding'

describe('normalizeCustomerEmail', () => {
  it('restituisce null per assente o vuota', () => {
    expect(normalizeCustomerEmail(undefined)).toBeNull()
    expect(normalizeCustomerEmail(null)).toBeNull()
    expect(normalizeCustomerEmail('')).toBeNull()
    expect(normalizeCustomerEmail('   ')).toBeNull()
  })

  it('trimma e abbassa il case', () => {
    expect(normalizeCustomerEmail('  Mario@Test.IT ')).toBe('mario@test.it')
  })
})

describe('tryNormalizePhone', () => {
  it('normalizza un cellulare italiano valido', () => {
    expect(tryNormalizePhone('333 1234567')).toEqual({ ok: true, phone: '+393331234567' })
    expect(tryNormalizePhone('+39 333 1234567')).toEqual({ ok: true, phone: '+393331234567' })
  })

  it('non lancia su input non valido, restituisce ok:false', () => {
    const r = tryNormalizePhone('abc')
    expect(r.ok).toBe(false)
  })

  it('rifiuta numeri non italiani', () => {
    const r = tryNormalizePhone('+1 555 1234567')
    expect(r.ok).toBe(false)
  })
})

describe('buildCustomerInsert', () => {
  const baseAddress = {
    street: '  Via Garibaldi 10 ',
    postalCode: '57125',
    city: ' Livorno ',
    buildingNumber: ' 10 ',
    floor: '  ',
    notes: undefined,
  }

  it('costruisce i valori e valorizza consentGivenAt quando c’è consenso', () => {
    const now = new Date('2026-06-10T12:00:00Z')
    const values = buildCustomerInsert({
      tenantId: 'tenant-1',
      phone: '+393331234567',
      name: '  Mario Rossi ',
      email: ' Mario@Test.IT ',
      address: baseAddress,
      hasConsentedDataStorage: true,
      deliveryCode: '7392',
      now,
    })

    expect(values).toMatchObject({
      tenantId: 'tenant-1',
      phone: '+393331234567',
      name: 'Mario Rossi',
      email: 'mario@test.it',
      deliveryCode: '7392',
      hasConsentedDataStorage: true,
      consentGivenAt: now,
    })
    expect(values.defaultAddress).toEqual({
      street: 'Via Garibaldi 10',
      postalCode: '57125',
      city: 'Livorno',
      buildingNumber: '10',
      floor: null,
      notes: null,
    })
  })

  it('lascia consentGivenAt a null senza consenso', () => {
    const values = buildCustomerInsert({
      tenantId: 'tenant-1',
      phone: '+393331234567',
      name: 'Mario',
      address: baseAddress,
      hasConsentedDataStorage: false,
      deliveryCode: '1111',
    })
    expect(values.hasConsentedDataStorage).toBe(false)
    expect(values.consentGivenAt).toBeNull()
    expect(values.email).toBeNull()
  })
})
