import { describe, expect, it } from 'vitest'
import {
  PERSONA_PRIORITY,
  QUESTION_BANK,
  QUESTION_CATEGORIES,
  SESSION_QUESTION_COUNT,
  selectQuestionsForSession,
} from './questions'
import {
  assignPersona,
  buildParticipantResult,
  buildResultSnapshot,
  calculateDinnerSuccessRate,
  calculateGroupStats,
  calculatePersonaScores,
  calculateSimilarity,
  isCompleteResponse,
} from './domain'
import type { GroupQuestionStat, ResponseRecord } from './types'

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

describe('persona assignment', () => {
  it('is deterministic for the same room questions and answers', () => {
    expect(assignPersona(allFirst, sessionQuestions)).toBe(assignPersona(allFirst, sessionQuestions))
  })

  it('chooses one of the highest-scoring personas', () => {
    const scores = calculatePersonaScores(allFirst, sessionQuestions)
    const persona = assignPersona(allFirst, sessionQuestions)
    expect(scores[persona]).toBe(Math.max(...Object.values(scores)))
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
