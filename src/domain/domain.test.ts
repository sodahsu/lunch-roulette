import { describe, expect, it } from 'vitest'
import { PERSONA_PRIORITY, QUESTIONS } from './questions'
import {
  assignPersona,
  buildParticipantResult,
  buildResultSnapshot,
  calculateGroupStats,
  calculateSimilarity,
  isCompleteResponse,
} from './domain'
import type { ResponseRecord } from './types'

const allFirst = Object.fromEntries(QUESTIONS.map((q) => [q.id, q.options[0]!.id]))
const allSecond = Object.fromEntries(QUESTIONS.map((q) => [q.id, q.options[1]!.id]))

function response(id: string, answers: Record<string, string>, complete = true): ResponseRecord {
  return {
    session_id: 's1',
    participant_id: id,
    answers,
    is_complete: complete,
    updated_at: new Date(0).toISOString(),
  }
}

describe('response completeness', () => {
  it('requires every required question', () => {
    expect(isCompleteResponse(allFirst)).toBe(true)

    const missing = { ...allFirst }
    delete missing[QUESTIONS[0]!.id]
    expect(isCompleteResponse(missing)).toBe(false)
  })
})

describe('group stats', () => {
  it('calculates stats for 3, 8 and 9 participants', () => {
    for (const count of [3, 8, 9]) {
      const rows = Array.from({ length: count }, (_, index) => response(String(index), allFirst))
      expect(calculateGroupStats(rows)[0]!.sampleSize).toBe(count)
    }
  })

  it('excludes incomplete responses', () => {
    const stats = calculateGroupStats([
      response('a', allFirst),
      response('b', allSecond, false),
    ])

    expect(stats[0]!.sampleSize).toBe(1)
    expect(Object.values(stats[0]!.counts).reduce((sum, count) => sum + count, 0)).toBe(1)
  })

  it('does not emit invalid stats with no complete responses', () => {
    const stats = calculateGroupStats([])
    expect(stats.every((stat) => stat.sampleSize === 0)).toBe(true)
    expect(stats.every((stat) => Object.keys(stat.counts).length === 0)).toBe(true)
  })
})

describe('persona assignment', () => {
  it('is deterministic for the same answers', () => {
    expect(assignPersona(allFirst)).toBe(assignPersona(allFirst))
  })

  it('uses the configured priority as a stable tie breaker', () => {
    expect(assignPersona({})).toBe(PERSONA_PRIORITY[0])
  })
})

describe('similarity and pairing', () => {
  it('calculates full and zero similarity', () => {
    expect(calculateSimilarity(allFirst, allFirst)).toBe(1)
    expect(calculateSimilarity(allFirst, allSecond)).toBe(0)
  })

  it('never pairs a participant with itself and finds highest and lowest matches', () => {
    const rows = [
      response('a', allFirst),
      response('b', allFirst),
      response('c', allSecond),
    ]

    const result = buildParticipantResult('a', rows)

    expect(result.soulmates).toEqual([{ participantId: 'b', similarity: 1 }])
    expect(result.opposites).toEqual([{ participantId: 'c', similarity: 0 }])
    expect([...result.soulmates, ...result.opposites].some((item) => item.participantId === 'a')).toBe(false)
  })

  it('keeps all tied highest and lowest matches', () => {
    const firstQuestion = QUESTIONS[0]!
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

    const result = buildParticipantResult('a', rows)

    expect(result.soulmates.map((item) => item.participantId)).toEqual(['b', 'c'])
    expect(result.opposites.map((item) => item.participantId)).toEqual(['d', 'e'])
  })

  it('returns no pairing when only one participant is complete', () => {
    const result = buildParticipantResult('a', [response('a', allFirst)])
    expect(result.soulmates).toEqual([])
    expect(result.opposites).toEqual([])
  })
})

describe('result snapshot', () => {
  it('excludes incomplete responses from participant results', () => {
    const snapshot = buildResultSnapshot([
      response('a', allFirst),
      response('b', allSecond),
      response('c', allFirst, false),
    ])

    expect(Object.keys(snapshot.participantResults)).toEqual(['a', 'b'])
    expect(snapshot.participantResults.c).toBeUndefined()
  })

  it('keeps participants distinct by participant id', () => {
    const snapshot = buildResultSnapshot([
      response('participant-1', allFirst),
      response('participant-2', allFirst),
    ])

    expect(Object.keys(snapshot.participantResults)).toEqual(['participant-1', 'participant-2'])
  })

  it('is stable when rebuilt from the same locked responses', () => {
    const rows = [
      response('a', allFirst),
      response('b', allSecond),
      response('c', allFirst),
    ]

    expect(buildResultSnapshot(rows)).toEqual(buildResultSnapshot(rows))
  })
})
