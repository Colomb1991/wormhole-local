import { describe, it, expect, vi } from 'vitest'
import { generateRandomCode, generateRandomCode5, generateUniqueCustomerCode } from './generator'

describe('generateRandomCode', () => {
  it('produces exactly 4 digits', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRandomCode()
      expect(code).toMatch(/^\d{4}$/)
      const n = parseInt(code, 10)
      expect(n).toBeGreaterThanOrEqual(1000)
      expect(n).toBeLessThanOrEqual(9999)
    }
  })
})

describe('generateRandomCode5', () => {
  it('produces exactly 5 digits', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRandomCode5()
      expect(code).toMatch(/^\d{5}$/)
    }
  })
})

describe('generateUniqueCustomerCode', () => {
  it('returns first generated code if not taken', async () => {
    const codeExists = vi.fn().mockResolvedValue(false)
    const code = await generateUniqueCustomerCode(codeExists)
    expect(code).toMatch(/^\d{4}$/)
    expect(codeExists).toHaveBeenCalledTimes(1)
  })

  it('retries when first codes are taken', async () => {
    let callCount = 0
    const codeExists = vi.fn().mockImplementation(async () => {
      callCount++
      return callCount < 3 // first 2 calls: taken, 3rd: free
    })
    const code = await generateUniqueCustomerCode(codeExists)
    expect(code).toMatch(/^\d{4}$/)
    expect(codeExists).toHaveBeenCalledTimes(3)
  })

  it('falls back to 5-digit code when 4-digit attempts all collide', async () => {
    let callCount = 0
    const codeExists = vi.fn().mockImplementation(async () => {
      callCount++
      // first 10 (4-digit attempts): all taken
      // 11th onward (5-digit attempts): free at first call
      return callCount <= 10
    })
    const code = await generateUniqueCustomerCode(codeExists)
    expect(code).toMatch(/^\d{5}$/)
    expect(callCount).toBe(11)
  })

  it('throws after all retries fail', async () => {
    const codeExists = vi.fn().mockResolvedValue(true)
    await expect(generateUniqueCustomerCode(codeExists)).rejects.toThrow(
      /Could not generate unique/
    )
  })
})
