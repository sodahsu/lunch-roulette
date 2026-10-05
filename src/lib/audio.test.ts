import { describe, expect, it, beforeEach } from 'vitest'
import {
  isAudioMuted,
  setAudioMuted,
  playCue,
  startLobbyLoop,
  stopLobbyLoop,
  type AudioCue,
} from './audio'

describe('audio service', () => {
  beforeEach(() => {
    // 預設為已靜音，避免在無音效硬體的 CI/測試環境中實際調用 AudioContext
    setAudioMuted(true)
  })

  it('toggles audio muted state', () => {
    setAudioMuted(false)
    expect(isAudioMuted()).toBe(false)

    setAudioMuted(true)
    expect(isAudioMuted()).toBe(true)
  })

  it('safely handles playCue when muted without throwing', () => {
    setAudioMuted(true)
    const cues: AudioCue[] = ['click', 'lock', 'countdown', 'suspense', 'reveal', 'victory']

    for (const cue of cues) {
      expect(() => playCue(cue)).not.toThrow()
    }
  })

  it('safely handles startLobbyLoop and stopLobbyLoop when muted', () => {
    setAudioMuted(true)
    expect(() => startLobbyLoop()).not.toThrow()
    expect(() => stopLobbyLoop()).not.toThrow()
  })
})
