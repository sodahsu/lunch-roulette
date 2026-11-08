import { describe, expect, it } from 'vitest'
import {
  CURRENT_QUESTIONNAIRE_VERSION,
  PERSONAS,
  QUESTION_BANK,
  QUESTION_BANK_V03,
  QUESTION_CATEGORIES,
  SESSION_QUESTION_COUNT,
  selectQuestionsForSession,
} from './questions'
import { assignPersona, calculateDinnerSuccessRate } from './domain'
import { hashFnv1a } from './hash'
import type { GroupQuestionStat, PersonaKey } from './types'

const PERSONA_KEYS = Object.keys(PERSONAS) as PersonaKey[]
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function createRandom(seed: number) {
  let state = seed
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32)
}

// 以固定種子模擬大量房間：隨機房號 + 每題均勻隨機作答，回傳各人格占比
function simulatePersonaShares(version: string, rooms: number, seed: number): Record<PersonaKey, number> {
  const random = createRandom(seed)
  const counts = Object.fromEntries(PERSONA_KEYS.map((key) => [key, 0])) as Record<PersonaKey, number>

  for (let index = 0; index < rooms; index += 1) {
    const code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(random() * CODE_CHARS.length)]).join('')
    const questions = selectQuestionsForSession(code, version)
    const answers = Object.fromEntries(
      questions.map((question) => [question.id, question.options[Math.floor(random() * question.options.length)]!.id]),
    )
    counts[assignPersona(answers, questions)] += 1
  }

  return Object.fromEntries(PERSONA_KEYS.map((key) => [key, counts[key] / rooms])) as Record<PersonaKey, number>
}

function spread(shares: Record<PersonaKey, number>) {
  const values = Object.values(shares)
  return { max: Math.max(...values), min: Math.min(...values), gap: Math.max(...values) - Math.min(...values) }
}

function stat(counts: Record<string, number>, sampleSize = 8): GroupQuestionStat {
  return { questionId: 'q', counts, sampleSize }
}

describe('v0.3 questionnaire contract', () => {
  it('uses v0.3 as the questionnaire version for new rooms', () => {
    expect(CURRENT_QUESTIONNAIRE_VERSION).toBe('v0.3')
  })

  it('has a 48-question required bank across six categories of eight', () => {
    expect(QUESTION_BANK_V03).toHaveLength(48)
    expect(QUESTION_BANK_V03.every((question) => question.required)).toBe(true)
    expect(new Set(QUESTION_BANK_V03.map((question) => question.id)).size).toBe(48)

    for (const category of QUESTION_CATEGORIES) {
      expect(QUESTION_BANK_V03.filter((question) => question.category === category)).toHaveLength(8)
    }
  })

  it('keeps every question a two-option choice where each option scores at least one persona', () => {
    for (const question of QUESTION_BANK_V03) {
      expect(question.options, question.id).toHaveLength(2)
      expect(new Set(question.options.map((option) => option.id)).size, question.id).toBe(2)

      for (const option of question.options) {
        const entries = Object.entries(option.scores)
        expect(entries.length, `${question.id}/${option.id}`).toBeGreaterThan(0)
        for (const [key, score] of entries) {
          expect(PERSONA_KEYS, `${question.id}/${option.id}`).toContain(key)
          expect(Number.isInteger(score) && score! >= 1 && score! <= 3, `${question.id}/${option.id}/${key}`).toBe(true)
        }
      }
    }
  })

  it('lets all ten personas score in every category', () => {
    for (const category of QUESTION_CATEGORIES) {
      const scoring = new Set<PersonaKey>()
      for (const question of QUESTION_BANK_V03.filter((item) => item.category === category)) {
        for (const option of question.options) {
          for (const key of Object.keys(option.scores) as PersonaKey[]) scoring.add(key)
        }
      }
      expect([...scoring].sort(), category).toEqual([...PERSONA_KEYS].sort())
    }
  })

  it('keeps self-image with the "very" option because the host screen counts it', () => {
    const selfImage = QUESTION_BANK_V03.find((question) => question.id === 'self-image')

    expect(selfImage?.category).toBe('identity')
    expect(selfImage?.options.map((option) => option.id)).toContain('very')
  })

  it('does not let self-image favour a single persona', () => {
    const selfImage = QUESTION_BANK_V03.find((question) => question.id === 'self-image')!
    const strongest = selfImage.options.flatMap((option) => Object.values(option.scores))

    expect(Math.max(...(strongest as number[]))).toBeLessThanOrEqual(2)
  })

  it('selects 12 stable questions per room with two per category and self-image included', () => {
    const first = selectQuestionsForSession('ABC123', 'v0.3')
    const second = selectQuestionsForSession('abc123 ', 'v0.3')

    expect(first).toEqual(second)
    expect(first).toHaveLength(SESSION_QUESTION_COUNT)
    expect(first.some((question) => question.id === 'self-image')).toBe(true)

    for (const category of QUESTION_CATEGORIES) {
      expect(first.filter((question) => question.category === category)).toHaveLength(2)
    }
  })

  it('draws every v0.3 question from the v0.3 bank and covers the whole bank across rooms', () => {
    const bankIds = new Set(QUESTION_BANK_V03.map((question) => question.id))
    const seen = new Set<string>()
    const random = createRandom(11)

    for (let index = 0; index < 2000; index += 1) {
      const code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(random() * CODE_CHARS.length)]).join('')
      for (const question of selectQuestionsForSession(code, 'v0.3')) {
        expect(bankIds.has(question.id)).toBe(true)
        seen.add(question.id)
      }
    }

    expect(seen.size).toBe(48)
  })

  it('maps v0.3 to the v1 dinner-success algorithm and still rejects unknown versions', () => {
    const stats = [stat({ a: 6, b: 2 }), stat({ a: 7, b: 1 })]

    expect(calculateDinnerSuccessRate(stats, 'v0.3')).toEqual(calculateDinnerSuccessRate(stats, 'v0.2'))
    expect(() => calculateDinnerSuccessRate(stats, 'v0.4')).toThrow(/Unsupported dinner-success algorithm/)
  })
})

describe('v0.2 and v0.1 stay frozen after v0.3', () => {
  // 這些摘要在新增 v0.3 之前以原程式碼量測；任何 v0.2 題目、配分、抽題或人格判定的改動都會讓它們失敗
  it('keeps the v0.2 bank byte-identical', () => {
    expect(QUESTION_BANK).toHaveLength(24)
    expect(hashFnv1a(JSON.stringify(QUESTION_BANK))).toBe(2382581427)
  })

  it('keeps v0.2 room selection and persona results identical for 500 rooms', () => {
    const random = createRandom(7)
    const rows: string[] = []

    for (let index = 0; index < 500; index += 1) {
      const code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(random() * CODE_CHARS.length)]).join('')
      const questions = selectQuestionsForSession(code, 'v0.2')
      const answers = Object.fromEntries(
        questions.map((question) => [question.id, question.options[Math.floor(random() * 2)]!.id]),
      )
      rows.push(`${code}|${questions.map((question) => question.id).join(',')}|${assignPersona(answers, questions)}`)
    }

    expect(hashFnv1a(rows.join('\n'))).toBe(897899289)
  })

  it('keeps pinned v0.2 selections for known room codes', () => {
    expect(selectQuestionsForSession('ABC123', 'v0.2').map((question) => question.id)).toEqual([
      'bad-chair', 'wrong-dish', 'rain', 'signature-dish', 'aa-bill', 'shabby-gem',
      'discussion-stuck', 'blame', 'distance', 'mystery-dish', 'self-image', 'group-choice',
    ])
    expect(selectQuestionsForSession('ROOM42', 'v0.2').map((question) => question.id)).toEqual([
      'queue', 'blame', 'you-decide', 'wrong-dish', 'signature-dish', 'seven-one',
      'aa-bill', 'last-bite', 'distance', 'shabby-gem', 'self-image', 'new-place',
    ])
  })

  it('does not let the v0.3 bank leak into v0.2 or v0.1 rooms', () => {
    const v02Ids = new Set(QUESTION_BANK.map((question) => question.id))
    const questionsV02 = selectQuestionsForSession('QWE456', 'v0.2')

    expect(questionsV02.every((question) => v02Ids.has(question.id))).toBe(true)
    expect(questionsV02.every((question) => QUESTION_BANK.includes(question))).toBe(true)
    expect(selectQuestionsForSession('QWE456', 'v0.1')).toHaveLength(8)
  })
})

describe('persona balance under random answers', () => {
  const ROOMS = 20000
  const v02 = simulatePersonaShares('v0.2', ROOMS, 20261108)
  const v03 = simulatePersonaShares('v0.3', ROOMS, 20261108)

  it('prints the distribution when BALANCE_REPORT is set', () => {
    if (!process.env.BALANCE_REPORT) return

    const rows = PERSONA_KEYS.map((key) => `${PERSONAS[key].name.padEnd(8, '　')} v0.2 ${(v02[key] * 100).toFixed(1).padStart(5)}%   v0.3 ${(v03[key] * 100).toFixed(1).padStart(5)}%`)
    const a = spread(v02)
    const b = spread(v03)
    console.info([
      `rooms=${ROOMS}`,
      ...rows,
      `v0.2 max ${(a.max * 100).toFixed(1)}% min ${(a.min * 100).toFixed(1)}% gap ${(a.gap * 100).toFixed(1)}pt ratio ${(a.max / a.min).toFixed(2)}x`,
      `v0.3 max ${(b.max * 100).toFixed(1)}% min ${(b.min * 100).toFixed(1)}% gap ${(b.gap * 100).toFixed(1)}pt ratio ${(b.max / b.min).toFixed(2)}x`,
    ].join('\n'))
  })

  it('documents the v0.2 imbalance that v0.3 fixes', () => {
    expect(spread(v02).gap).toBeGreaterThan(0.12)
    expect(v02.easygoing).toBeLessThan(0.05)
  })

  it('shrinks the gap between the most and least common persona to under half of v0.2', () => {
    expect(spread(v03).gap).toBeLessThan(spread(v02).gap / 2)
  })

  // 實測（固定種子）約 1.7 個百分點；大樣本（20 萬房）約 2 個百分點。門檻留餘裕給日後微調，但擋得住回到失衡
  it('keeps the most and least common persona within a 3.5-point gap', () => {
    expect(spread(v03).gap).toBeLessThanOrEqual(0.035)
  })

  it('lets every persona, including the signature easygoing one, land between 7.5% and 12.5%', () => {
    for (const key of PERSONA_KEYS) {
      expect(v03[key], key).toBeGreaterThanOrEqual(0.075)
      expect(v03[key], key).toBeLessThanOrEqual(0.125)
    }
  })
})

describe('v0.3 personas stay earnable on purpose', () => {
  // 平衡不能靠把配分稀釋到誰都拿不到：刻意每題選某人格分數較高的選項，多半要真的拿到那個人格
  it.each(PERSONA_KEYS)('%s is the result in most rooms when answering toward it', (target) => {
    const random = createRandom(5)
    const rooms = 600
    let hits = 0

    for (let index = 0; index < rooms; index += 1) {
      const code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(random() * CODE_CHARS.length)]).join('')
      const questions = selectQuestionsForSession(code, 'v0.3')
      const answers = Object.fromEntries(
        questions.map((question) => {
          const [first, second] = question.options
          const a = first!.scores[target] ?? 0
          const b = second!.scores[target] ?? 0
          const pick = a === b ? Math.floor(random() * 2) : a > b ? first! : second!
          return [question.id, typeof pick === 'number' ? question.options[pick]!.id : pick.id]
        }),
      )
      if (assignPersona(answers, questions) === target) hits += 1
    }

    expect(hits / rooms).toBeGreaterThanOrEqual(0.6)
  })
})
