import { PERSONA_PRIORITY, PERSONAS, QUESTIONS } from './questions'
import type {
  AnswerValue,
  GroupQuestionStat,
  ParticipantResult,
  PersonaKey,
  ResponseRecord,
  ResultSnapshot,
} from './types'

export function isCompleteResponse(answers: Record<string, AnswerValue>): boolean {
  return QUESTIONS.filter((q) => q.required).every((q) => Boolean(answers[q.id]))
}

export function calculateGroupStats(responses: ResponseRecord[]): GroupQuestionStat[] {
  const complete = responses.filter((response) => response.is_complete)

  return QUESTIONS.map((question) => {
    const counts: Record<string, number> = {}
    for (const response of complete) {
      const answer = response.answers[question.id]
      if (!answer) continue
      counts[answer] = (counts[answer] ?? 0) + 1
    }
    return {
      questionId: question.id,
      counts,
      sampleSize: complete.length,
    }
  })
}

export function calculatePersonaScores(answers: Record<string, AnswerValue>): Record<PersonaKey, number> {
  const scores = Object.fromEntries(
    Object.keys(PERSONAS).map((key) => [key, 0]),
  ) as Record<PersonaKey, number>

  for (const question of QUESTIONS) {
    const selected = question.options.find((option) => option.id === answers[question.id])
    if (!selected) continue

    for (const [key, score] of Object.entries(selected.scores)) {
      scores[key as PersonaKey] += score ?? 0
    }
  }

  return scores
}

export function assignPersona(answers: Record<string, AnswerValue>): PersonaKey {
  const scores = calculatePersonaScores(answers)
  const priority = new Map(PERSONA_PRIORITY.map((key, index) => [key, index]))
  const ranked = (Object.keys(scores) as PersonaKey[]).sort((a, b) => {
    const delta = scores[b] - scores[a]
    if (delta !== 0) return delta
    return (priority.get(a) ?? 999) - (priority.get(b) ?? 999)
  })
  return ranked[0] ?? 'easygoing'
}

export function calculateSimilarity(
  a: Record<string, AnswerValue>,
  b: Record<string, AnswerValue>,
): number {
  const comparable = QUESTIONS.filter((question) => a[question.id] && b[question.id])
  if (comparable.length === 0) return 0
  const same = comparable.filter((question) => a[question.id] === b[question.id]).length
  return same / comparable.length
}

export function buildParticipantResult(
  participantId: string,
  responses: ResponseRecord[],
): ParticipantResult {
  const complete = responses.filter((response) => response.is_complete)
  const current = complete.find((response) => response.participant_id === participantId)
  if (!current) {
    return { persona: 'easygoing', soulmates: [], opposites: [] }
  }

  const comparisons = complete
    .filter((response) => response.participant_id !== participantId)
    .map((response) => ({
      participantId: response.participant_id,
      similarity: calculateSimilarity(current.answers, response.answers),
    }))

  if (comparisons.length === 0) {
    return { persona: assignPersona(current.answers), soulmates: [], opposites: [] }
  }

  const similarities = comparisons.map((item) => item.similarity)
  const max = Math.max(...similarities)
  const min = Math.min(...similarities)

  return {
    persona: assignPersona(current.answers),
    soulmates: comparisons.filter((item) => item.similarity === max),
    opposites: comparisons.filter((item) => item.similarity === min),
  }
}

export function buildResultSnapshot(responses: ResponseRecord[]): ResultSnapshot {
  const complete = responses.filter((response) => response.is_complete)
  const participantResults = Object.fromEntries(
    complete.map((response) => [
      response.participant_id,
      buildParticipantResult(response.participant_id, complete),
    ]),
  )

  return {
    groupStats: calculateGroupStats(complete),
    participantResults,
  }
}
