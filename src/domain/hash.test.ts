import { describe, expect, it } from 'vitest'
import { FNV_OFFSET_BASIS_32, FNV_PRIME_32, hashFnv1a } from './hash'

describe('FNV-1a 32-bit hash', () => {
  it('exposes the standard 32-bit constants', () => {
    expect(FNV_OFFSET_BASIS_32).toBe(2166136261)
    expect(FNV_PRIME_32).toBe(16777619)
  })

  it('computes empty string as the offset basis', () => {
    expect(hashFnv1a('')).toBe(FNV_OFFSET_BASIS_32)
  })

  it('produces deterministic 32-bit unsigned integers', () => {
    const hash1 = hashFnv1a('ABC123:order')
    const hash2 = hashFnv1a('ABC123:order')

    expect(hash1).toBe(hash2)
    expect(hash1).toBeGreaterThanOrEqual(0)
    expect(hash1).toBeLessThanOrEqual(2 ** 32 - 1)
  })

  it('differentiates distinct inputs', () => {
    expect(hashFnv1a('seed-a')).not.toBe(hashFnv1a('seed-b'))
  })
})
