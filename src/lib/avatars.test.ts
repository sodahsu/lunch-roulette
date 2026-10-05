import { describe, expect, it } from 'vitest'
import { avatarFor, personaArt } from './avatars'

describe('avatars', () => {
  it('assigns deterministic avatar URLs for the same participant ID', () => {
    const avatar1 = avatarFor('participant-abc-123')
    const avatar2 = avatarFor('participant-abc-123')
    expect(avatar1).toBe(avatar2)
    expect(avatar1).toBeTypeOf('string')
  })

  it('handles empty participant IDs without throwing', () => {
    expect(() => avatarFor('')).not.toThrow()
    expect(avatarFor('')).toBeTypeOf('string')
  })

  it('resolves persona art image URL for valid persona keys', () => {
    const art = personaArt('peacekeeper')
    expect(art).toBeDefined()
    expect(art).toContain('peacekeeper.webp')
  })

  it('returns undefined for non-existent persona keys to trigger SVG fallback', () => {
    const art = personaArt('unknown-super-hero')
    expect(art).toBeUndefined()
  })
})
