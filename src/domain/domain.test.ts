import { describe, expect, it } from 'vitest'
import { QUESTIONS } from './questions'
import {
  assignPersona,
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

describe('domain', () => {
  it('requires every required question', () => {
    expect(isCompleteResponse(allFirst)).toBe(true)
    const missing = { ...allFirst }
    delete missing[QUESTIONS[0]!.id]
    expect(isCompleteResponse(missing)).toBe(false)
  })

  it('calculates group stats for any participant count', () => {
    for (const count of [3, 8, 9]) {
      const rows = Array.from({ length: count }, (_, index) => response(String(index), allFirst))
      expect(calculateGroupStats(rows)[0]!.sampleSize).toBe(count)
    }
  })

  it('does not emit invalid stats with no complete responses', () => {
    const stats = calculateGroupStats([])
    expect(stats.every((stat) => stat.sampleSize === 0)).toBe(true)
  })

  it('assigns persona deterministically', () => {
    expect(assignPersona(allFirst)).toBe(assignPersona(allFirst))
  })

  it('calculates similarity and excludes incomplete rows from snapshots', () => {
    expect(calculateSimilarity(allFirst, allFirst)).toBe(1)
    expect(calculateSimilarity(allFirst, allSecond)).toBe(0)

    const snapshot = buildResultSnapshot([
      response('a', allFirst),
      response('b', allSecond),
      response('c', allFirst, false),
    ])

    expect(Object.keys(snapshot.participantResults)).toEqual(['a', 'b'])
    expect(snapshot.participantResults.a?.soulmates[0]?.participantId).toBe('b')
  })
})
