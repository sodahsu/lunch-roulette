import { describe, expect, it } from 'vitest'
import {
  PERSONAS,
  PERSONA_PRIORITY,
  QUESTION_BANK,
  QUESTION_CATEGORIES,
  SESSION_QUESTION_COUNT,
  selectQuestionsForSession,
} from './questions'
import {
  assignPersona,
  buildParticipantResult,
  buildProvisionalGroupPreview,
  buildResultSnapshot,
  calculateDinnerSuccessRate,
  calculateGroupStats,
  calculateMaxPersonaScores,
  calculatePersonaScores,
  calculateSimilarity,
  isCompleteResponse,
  isRareCard,
  RARE_CARD_RATE,
  RARE_CARD_GUARANTEE_REASON,
  RARE_CARD_REASON,
} from './domain'
import {
  FOOD_AVOID_ID,
  FOOD_AVOID_NONE,
  FOOD_OPTIONS,
  calculateFoodAvoidStat,
  calculateFoodConsensus,
  decodeFoodAvoid,
  encodeFoodAvoid,
} from './foods'
import type { GroupQuestionStat, PersonaKey, ResponseRecord } from './types'

const sessionQuestions = selectQuestionsForSession('ABC123', 'v0.2')
const allFirst = Object.fromEntries(sessionQuestions.map((q) => [q.id, q.options[0]!.id]))
const allSecond = Object.fromEntries(sessionQuestions.map((q) => [q.id, q.options[1]!.id]))

function response(id: string, answers: Record<string, string>, complete = true): ResponseRecord {
  return {
    session_id: 's1',
    participant_id: id,
    answers,
    is_complete: complete,
    updated_at: new Date(0).toISOString(),
  }
}

describe('v0.2 questionnaire contract', () => {
  it('has a 24-question required bank across six balanced categories', () => {
    expect(QUESTION_BANK).toHaveLength(24)
    expect(QUESTION_BANK.every((question) => question.required)).toBe(true)

    for (const category of QUESTION_CATEGORIES) {
      expect(QUESTION_BANK.filter((question) => question.category === category)).toHaveLength(4)
    }
  })

  it('selects 12 stable questions per room with two from each category', () => {
    const first = selectQuestionsForSession('ABC123', 'v0.2')
    const second = selectQuestionsForSession('ABC123', 'v0.2')

    expect(first).toEqual(second)
    expect(first).toHaveLength(SESSION_QUESTION_COUNT)
    expect(first.some((question) => question.id === 'self-image')).toBe(true)

    for (const category of QUESTION_CATEGORIES) {
      expect(first.filter((question) => question.category === category)).toHaveLength(2)
    }
  })

  it('keeps legacy v0.1 rooms on the original eight questions', () => {
    expect(selectQuestionsForSession('ABC123', 'v0.1').map((question) => question.id)).toEqual([
      'group-choice',
      'queue',
      'new-place',
      'budget',
      'distance',
      'you-decide',
      'last-bite',
      'self-image',
    ])
  })
})

describe('response completeness', () => {
  it('requires every selected required question', () => {
    expect(isCompleteResponse(allFirst, sessionQuestions)).toBe(true)

    const missing = { ...allFirst }
    delete missing[sessionQuestions[0]!.id]
    expect(isCompleteResponse(missing, sessionQuestions)).toBe(false)
  })
})

describe('group stats', () => {
  it('calculates stats for 3, 8 and 9 participants', () => {
    for (const count of [3, 8, 9]) {
      const rows = Array.from({ length: count }, (_, index) => response(String(index), allFirst))
      expect(calculateGroupStats(rows, sessionQuestions)[0]!.sampleSize).toBe(count)
    }
  })

  it('excludes incomplete responses', () => {
    const stats = calculateGroupStats(
      [response('a', allFirst), response('b', allSecond, false)],
      sessionQuestions,
    )

    expect(stats[0]!.sampleSize).toBe(1)
    expect(Object.values(stats[0]!.counts).reduce((sum, count) => sum + count, 0)).toBe(1)
  })

  it('does not emit invalid stats with no complete responses', () => {
    const stats = calculateGroupStats([], sessionQuestions)
    expect(stats.every((stat) => stat.sampleSize === 0)).toBe(true)
    expect(stats.every((stat) => Object.keys(stat.counts).length === 0)).toBe(true)
  })
})

describe('dinner success rate', () => {
  function stat(counts: Record<string, number>, sampleSize = 8): GroupQuestionStat {
    return { questionId: 'q', counts, sampleSize }
  }

  it('shows that a high-consensus group can go eat together', () => {
    const result = calculateDinnerSuccessRate([
      stat({ a: 8 }),
      stat({ a: 7, b: 1 }),
      stat({ a: 6, b: 2 }),
    ])

    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.verdict).toBe('今晚直接出門，不要再討論')
  })

  it('keeps the answer playful even when the group is split', () => {
    const result = calculateDinnerSuccessRate([
      stat({ a: 4, b: 4 }),
      stat({ a: 4, b: 4 }),
      stat({ a: 5, b: 3 }),
    ])

    expect(result.score).toBeLessThan(56)
    expect(result.verdict).toBe('有機會約成，先指定飯局隊長')
    expect(result.detail).toContain('隊長')
  })

  it('pins legacy questionnaire versions to the v1 dinner-success algorithm', () => {
    const stats = [
      stat({ a: 6, b: 2 }),
      stat({ a: 7, b: 1 }),
    ]

    expect(calculateDinnerSuccessRate(stats, 'v0.1')).toEqual(
      calculateDinnerSuccessRate(stats, 'v0.2'),
    )
  })

  it('requires an explicit algorithm mapping for a new questionnaire version', () => {
    expect(() => calculateDinnerSuccessRate([stat({ a: 8 })], 'v9.9')).toThrow(
      /Unsupported dinner-success algorithm/,
    )
  })
})

describe('provisional group preview', () => {
  it('keeps a single complete participant out of the group success percentage', () => {
    const preview = buildProvisionalGroupPreview(
      [response('solo', { ...allFirst, [FOOD_AVOID_ID]: FOOD_AVOID_NONE })],
      sessionQuestions,
      'v0.2',
    )

    expect(preview.groupStats[0]!.sampleSize).toBe(1)
    expect(preview.dinnerSuccess).toBeNull()
    expect(preview.groupStats.at(-1)!.questionId).toBe(FOOD_AVOID_ID)
  })

  it('uses the same dinner-success algorithm once two complete participants exist', () => {
    const rows = [
      response('a', { ...allFirst, [FOOD_AVOID_ID]: FOOD_AVOID_NONE }),
      response('b', { ...allSecond, [FOOD_AVOID_ID]: 'hotpot' }),
      response('ignored', allFirst, false),
    ]
    const preview = buildProvisionalGroupPreview(rows, sessionQuestions, 'v0.2')
    const expectedStats = calculateGroupStats(rows, sessionQuestions)

    expect(preview.groupStats[0]!.sampleSize).toBe(2)
    expect(preview.dinnerSuccess).toEqual(calculateDinnerSuccessRate(expectedStats, 'v0.2'))
    expect(preview.groupStats.at(-1)).toMatchObject({ questionId: FOOD_AVOID_ID, sampleSize: 2 })
  })
})

describe('persona assignment', () => {
  it('is deterministic for the same room questions and answers', () => {
    expect(assignPersona(allFirst, sessionQuestions)).toBe(assignPersona(allFirst, sessionQuestions))
  })

  it('chooses the persona with the highest score rate against its attainable maximum', () => {
    const scores = calculatePersonaScores(allFirst, sessionQuestions)
    const max = calculateMaxPersonaScores(sessionQuestions)
    const rate = (key: PersonaKey) => (max[key] > 0 ? scores[key] / max[key] : 0)
    const persona = assignPersona(allFirst, sessionQuestions)
    const best = Math.max(...(Object.keys(scores) as PersonaKey[]).map(rate))
    expect(rate(persona)).toBe(best)
  })

  it('can assign every one of the ten personas across different rooms', () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let seed = 20260930
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
    const seen = new Set<PersonaKey>()

    for (let index = 0; index < 4000; index += 1) {
      const code = Array.from({ length: 6 }, () => chars[Math.floor(rnd() * chars.length)]).join('')
      const questions = selectQuestionsForSession(code, 'v0.2')
      const answers = Object.fromEntries(
        questions.map((question) => [question.id, question.options[Math.floor(rnd() * question.options.length)]!.id]),
      )
      seen.add(assignPersona(answers, questions))
    }

    expect([...seen].sort()).toEqual(Object.keys(PERSONAS).sort())
  })

  it('uses the configured priority as a stable tie breaker', () => {
    expect(assignPersona({}, sessionQuestions)).toBe(PERSONA_PRIORITY[0])
  })
})

describe('similarity and pairing', () => {
  it('calculates full and zero similarity', () => {
    expect(calculateSimilarity(allFirst, allFirst, sessionQuestions)).toBe(1)
    expect(calculateSimilarity(allFirst, allSecond, sessionQuestions)).toBe(0)
  })

  it('never pairs a participant with itself and finds highest and lowest matches', () => {
    const rows = [
      response('a', allFirst),
      response('b', allFirst),
      response('c', allSecond),
    ]

    const result = buildParticipantResult('a', rows, sessionQuestions)

    expect(result.soulmates).toEqual([{ participantId: 'b', similarity: 1 }])
    expect(result.opposites).toEqual([{ participantId: 'c', similarity: 0 }])
    expect([...result.soulmates, ...result.opposites].some((item) => item.participantId === 'a')).toBe(false)
  })

  it('keeps all tied highest and lowest matches', () => {
    const firstQuestion = sessionQuestions[0]!
    const mixed = {
      ...allFirst,
      [firstQuestion.id]: firstQuestion.options[1]!.id,
    }

    const rows = [
      response('a', allFirst),
      response('b', allFirst),
      response('c', allFirst),
      response('d', mixed),
      response('e', mixed),
    ]

    const result = buildParticipantResult('a', rows, sessionQuestions)

    expect(result.soulmates.map((item) => item.participantId)).toEqual(['b', 'c'])
    expect(result.opposites.map((item) => item.participantId)).toEqual(['d', 'e'])
  })

  it('returns no pairing when only one participant is complete', () => {
    const result = buildParticipantResult('a', [response('a', allFirst)], sessionQuestions)
    expect(result.soulmates).toEqual([])
    expect(result.opposites).toEqual([])
  })
})

describe('result snapshot', () => {
  it('excludes incomplete responses from participant results', () => {
    const snapshot = buildResultSnapshot(
      [
        response('a', allFirst),
        response('b', allSecond),
        response('c', allFirst, false),
      ],
      sessionQuestions,
    )

    expect(Object.keys(snapshot.participantResults)).toEqual(['a', 'b'])
    expect(snapshot.participantResults.c).toBeUndefined()
  })

  it('keeps participants distinct by participant id', () => {
    const snapshot = buildResultSnapshot(
      [
        response('participant-1', allFirst),
        response('participant-2', allFirst),
      ],
      sessionQuestions,
    )

    expect(Object.keys(snapshot.participantResults)).toEqual(['participant-1', 'participant-2'])
  })

  it('is stable when rebuilt from the same locked responses', () => {
    const rows = [
      response('a', allFirst),
      response('b', allSecond),
      response('c', allFirst),
    ]

    expect(buildResultSnapshot(rows, sessionQuestions)).toEqual(
      buildResultSnapshot(rows, sessionQuestions),
    )
  })
})

describe('rare card', () => {
  it('is deterministic per participant', () => {
    expect(isRareCard('participant-1')).toBe(isRareCard('participant-1'))
  })

  it('records the reason on rare results only', () => {
    const id = Array.from({ length: 2000 }, (_, index) => `p-${index}`).find(isRareCard)!
    const plain = Array.from({ length: 2000 }, (_, index) => `p-${index}`).find((x) => !isRareCard(x))!
    const build = (pid: string) =>
      buildParticipantResult(pid, [{ session_id: 's', participant_id: pid, answers: allFirst, is_complete: true, updated_at: '' }], sessionQuestions)
    expect(build(id)).toMatchObject({ rare: true, rareReason: RARE_CARD_REASON })
    expect(build(plain).rare).toBe(false)
    expect(build(plain).rareReason).toBeUndefined()
  })

  it('hits about 3% of random participant ids', () => {
    const total = 20000
    let hits = 0
    for (let index = 0; index < total; index += 1) {
      if (isRareCard(crypto.randomUUID())) hits += 1
    }
    const rate = hits / total
    expect(rate).toBeGreaterThan(RARE_CARD_RATE * 0.7)
    expect(rate).toBeLessThan(RARE_CARD_RATE * 1.3)
  })
})

describe('rare card guarantee', () => {
  const respond = (id: string) => ({
    session_id: 's',
    participant_id: id,
    answers: allFirst,
    is_complete: true,
    updated_at: '',
  })
  const rareIds = (ids: string[]) =>
    Object.entries(buildResultSnapshot(ids.map(respond), sessionQuestions).participantResults)
      .filter(([, result]) => result.rare)
      .map(([id]) => id)

  it('gives every session at least one rare card, even for a single player', () => {
    for (let session = 0; session < 300; session += 1) {
      const size = 1 + (session % 8)
      const ids = Array.from({ length: size }, (_, index) => `s${session}-p${index}`)
      expect(rareIds(ids).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('uses the honest guarantee reason only when nobody won the 3% draw', () => {
    const noWinners = Array.from({ length: 8 }, (_, index) => `g-${index}`).filter((id) => !isRareCard(id))
    const [luckyId] = rareIds(noWinners)
    const result = buildResultSnapshot(noWinners.map(respond), sessionQuestions).participantResults[luckyId!]!
    expect(result.rareReason).toBe(RARE_CARD_GUARANTEE_REASON)

    const winner = Array.from({ length: 2000 }, (_, index) => `w-${index}`).find(isRareCard)!
    const natural = buildResultSnapshot([respond(winner), respond('x-plain-1')], sessionQuestions)
    expect(natural.participantResults[winner]!.rareReason).toBe(RARE_CARD_REASON)
  })

  it('is reproducible for the same participants', () => {
    const ids = ['a-1', 'a-2', 'a-3', 'a-4']
    expect(rareIds(ids)).toEqual(rareIds(ids))
  })
})

describe('food consensus', () => {
  const withFood = (id: string, food: string | undefined, complete = true) =>
    response(id, food === undefined ? allFirst : { ...allFirst, [FOOD_AVOID_ID]: food }, complete)

  it('round-trips selections and tells "no restriction" apart from "unanswered"', () => {
    expect(encodeFoodAvoid([])).toBe(FOOD_AVOID_NONE)
    expect(decodeFoodAvoid(FOOD_AVOID_NONE)).toEqual([])
    expect(decodeFoodAvoid(undefined)).toBeUndefined()
    expect(decodeFoodAvoid(encodeFoodAvoid(['spicy', 'hotpot', 'bogus']))).toEqual(['hotpot', 'spicy'])
  })

  it('lists only foods that nobody ruled out', () => {
    const stat = calculateFoodAvoidStat([
      withFood('a', 'hotpot,spicy'),
      withFood('b', 'bbq'),
      withFood('c', FOOD_AVOID_NONE),
    ])!
    expect(stat.sampleSize).toBe(3)
    const consensus = calculateFoodConsensus(stat)!
    const ids = consensus.safe.map((food) => food.id)
    expect(ids).not.toContain('hotpot')
    expect(ids).not.toContain('bbq')
    expect(ids).not.toContain('spicy')
    expect(ids).toContain('japanese')
  })

  it('skips people who did not answer instead of treating them as "eats anything"', () => {
    const stat = calculateFoodAvoidStat([withFood('a', 'hotpot'), withFood('b', undefined)])!
    expect(stat.sampleSize).toBe(1)
    expect(calculateFoodAvoidStat([withFood('a', undefined)])).toBeNull()
  })

  it('returns no safe foods when every category is ruled out by someone', () => {
    const all = FOOD_OPTIONS.map((food) => food.id)
    const consensus = calculateFoodConsensus(
      calculateFoodAvoidStat([
        withFood('a', all.join(',')),
        withFood('b', all.filter((id) => id !== 'noodles').join(',')),
      ]),
    )!
    expect(consensus.safe).toEqual([])
    expect(consensus.sampleSize).toBe(2)
  })

  it('appends the food stat to the snapshot without disturbing question stats', () => {
    const snapshot = buildResultSnapshot([withFood('a', 'hotpot'), withFood('b', 'none')], sessionQuestions)
    expect(snapshot.groupStats.at(-1)!.questionId).toBe(FOOD_AVOID_ID)
    expect(snapshot.groupStats).toHaveLength(sessionQuestions.length + 1)
    const legacy = buildResultSnapshot([withFood('a', undefined)], sessionQuestions)
    expect(legacy.groupStats).toHaveLength(sessionQuestions.length)
  })
})
