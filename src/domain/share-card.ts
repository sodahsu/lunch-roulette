import { PERSONAS } from './questions'
import type { ParticipantResult, PersonaKey } from './types'

const RARE_LABEL = '★ SSR · 頂級稀有'
const COMMON_LABEL = 'DINNER IDENTITY'

export function shareCardText(result: Pick<ParticipantResult, 'persona' | 'rare'>) {
  const persona = PERSONAS[result.persona]
  return { name: persona.name, tagline: persona.tagline, rarity: result.rare ? RARE_LABEL : COMMON_LABEL }
}

export interface PersonaShareCard {
  persona: PersonaKey
  name: string
  tagline: string
  rarity: string
  rare: boolean
}

// 卡面欄位固定白名單：呼叫端傳入完整 ParticipantResult 也只會取走自己的人格與稀有旗標，配對與稀有原因不會流進 canvas
export function personaShareCard(result: Pick<ParticipantResult, 'persona' | 'rare'>): PersonaShareCard {
  return { persona: result.persona, ...shareCardText(result), rare: Boolean(result.rare) }
}

// 與 result-reveal 的「樣本不足」規則一致：少於兩位 complete participant 不顯示團體成功率
export const GROUP_CARD_MIN_SAMPLE = 2

export interface GroupShareCardInput {
  score: number
  verdict: string
  sampleSize: number
  date: Date
}

export interface GroupShareCard {
  kicker: string
  title: string
  score: number
  scoreText: string
  verdict: string
  sampleText: string
  dateText: string
}

function formatLocalDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// 只逐欄取 aggregate：不收參加者、人格、配對或房號，即使呼叫端多傳欄位也不會被帶進輸出
export function groupShareCard({ score, verdict, sampleSize, date }: GroupShareCardInput): GroupShareCard | null {
  if (sampleSize < GROUP_CARD_MIN_SAMPLE) return null
  const bounded = Math.min(100, Math.max(0, Math.round(score)))
  return {
    kicker: '都可以？ / GROUP RESULT',
    title: '我們這團今晚約成飯的成功率',
    score: bounded,
    scoreText: `${bounded}%`,
    verdict,
    sampleText: `有效樣本 ${sampleSize} 人`,
    dateText: formatLocalDate(date),
  }
}
