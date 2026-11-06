import { PERSONAS } from './questions'
import type { ParticipantResult } from './types'

export function shareCardText(result: Pick<ParticipantResult, 'persona' | 'rare'>) {
  const persona = PERSONAS[result.persona]
  return { name: persona.name, tagline: persona.tagline, rarity: result.rare ? '★ SSR · 頂級稀有' : 'DINNER IDENTITY' }
}
