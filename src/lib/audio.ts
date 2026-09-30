export type AudioCue =
  | 'click'
  | 'lock'
  | 'countdown'
  | 'suspense'
  | 'reveal'
  | 'victory'

const STORAGE_KEY = 'lunch-roulette-audio-muted'

let context: AudioContext | null = null
let masterGain: GainNode | null = null
let lobbyInterval: number | null = null
let muted = localStorage.getItem(STORAGE_KEY) === '1'

function getContext() {
  if (typeof window === 'undefined') return null
  if (!context) {
    context = new AudioContext()
    masterGain = context.createGain()
    masterGain.gain.value = muted ? 0 : 0.16
    masterGain.connect(context.destination)
  }
  return context
}

export function isAudioMuted() {
  return muted
}

export function setAudioMuted(next: boolean) {
  muted = next
  localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  if (masterGain && context) {
    masterGain.gain.cancelScheduledValues(context.currentTime)
    masterGain.gain.setTargetAtTime(next ? 0 : 0.16, context.currentTime, 0.025)
  }
  if (next) stopLobbyLoop()
}

export async function unlockAudio() {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') await ctx.resume()
}

function tone(
  frequency: number,
  duration: number,
  options: {
    type?: OscillatorType
    gain?: number
    start?: number
    endFrequency?: number
  } = {},
) {
  const ctx = getContext()
  if (!ctx || !masterGain || muted) return

  const start = ctx.currentTime + (options.start ?? 0)
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = options.type ?? 'sine'
  oscillator.frequency.setValueAtTime(frequency, start)
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, start + duration)
  }

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(options.gain ?? 0.22, start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  oscillator.connect(gain)
  gain.connect(masterGain)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.03)
}

export function playCue(cue: AudioCue) {
  if (muted) return

  switch (cue) {
    case 'click':
      tone(540, 0.08, { type: 'triangle', gain: 0.12, endFrequency: 720 })
      break
    case 'lock':
      tone(240, 0.12, { type: 'square', gain: 0.11 })
      tone(360, 0.16, { type: 'triangle', gain: 0.12, start: 0.08 })
      break
    case 'countdown':
      tone(180, 0.1, { type: 'square', gain: 0.11 })
      break
    case 'suspense':
      tone(110, 0.85, { type: 'sawtooth', gain: 0.08, endFrequency: 260 })
      tone(165, 0.85, { type: 'triangle', gain: 0.06, start: 0.12, endFrequency: 330 })
      break
    case 'reveal':
      tone(260, 0.16, { type: 'triangle', gain: 0.12, endFrequency: 520 })
      tone(520, 0.22, { type: 'sine', gain: 0.14, start: 0.1, endFrequency: 780 })
      break
    case 'victory':
      tone(330, 0.14, { type: 'triangle', gain: 0.12 })
      tone(440, 0.16, { type: 'triangle', gain: 0.12, start: 0.11 })
      tone(660, 0.24, { type: 'triangle', gain: 0.14, start: 0.22 })
      break
  }
}

export function startLobbyLoop() {
  if (muted || lobbyInterval !== null) return
  void unlockAudio().then(() => {
    if (muted || lobbyInterval !== null) return

    let beat = 0
    const tick = () => {
      const pattern = [110, 0, 147, 0, 110, 165, 0, 147]
      const frequency = pattern[beat % pattern.length]!
      if (frequency) tone(frequency, 0.12, { type: 'triangle', gain: 0.035 })
      beat += 1
    }

    tick()
    lobbyInterval = window.setInterval(tick, 360)
  })
}

export function stopLobbyLoop() {
  if (lobbyInterval !== null) {
    window.clearInterval(lobbyInterval)
    lobbyInterval = null
  }
}
