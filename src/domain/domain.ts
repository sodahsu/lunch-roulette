import { PERSONA_PRIORITY, PERSONAS, QUESTIONS } from './questions'
import type {
  AnswerValue,
  DinnerSuccessResult,
  GroupQuestionStat,
  ParticipantResult,
  PersonaKey,
  Question,
  ResponseRecord,
  ResultSnapshot,
} from './types'

export function isCompleteResponse(
  answers: Record<string, AnswerValue>,
  questions: Question[] = QUESTIONS,
): boolean {
  return questions.filter((q) => q.required).every((q) => Boolean(answers[q.id]))
}

export function calculateGroupStats(
  responses: ResponseRecord[],
  questions: Question[] = QUESTIONS,
): GroupQuestionStat[] {
  const complete = responses.filter((response) => response.is_complete)

  return questions.map((question) => {
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

export function calculateDinnerSuccessRate(stats: GroupQuestionStat[]): DinnerSuccessResult {
  const usable = stats.filter((stat) => stat.sampleSize > 1)
  if (usable.length === 0) {
    return {
      score: 0,
      verdict: '先不要急著訂位',
      detail: '目前有效樣本太少，還看不出今晚到底約不約得成。',
    }
  }

  const agreement =
    usable.reduce((sum, stat) => {
      const majority = Math.max(0, ...Object.values(stat.counts))
      return sum + majority / stat.sampleSize
    }, 0) / usable.length

  const score = Math.round(agreement * 100)

  if (score >= 80) {
    return {
      score,
      verdict: '今晚直接出門，不要再討論',
      detail: '共識高到有點可疑。選一家，現在出門。',
    }
  }

  if (score >= 68) {
    return {
      score,
      verdict: '今晚約得成，找一個人負責訂位',
      detail: '大方向合得來，少數爭議交給一個人拍板就好。',
    }
  }

  if (score >= 56) {
    return {
      score,
      verdict: '約得成，但不要再開全民表決',
      detail: '你們不是沒共識，只是每多問一個人就多一個意見。',
    }
  }

  return {
    score,
    verdict: '有機會約成，先指定飯局隊長',
    detail: '這團的問題不是沒東西吃，是大家都太有想法。先指定隊長再出門。',
  }
}

export function calculatePersonaScores(
  answers: Record<string, AnswerValue>,
  questions: Question[] = QUESTIONS,
): Record<PersonaKey, number> {
  const scores = Object.fromEntries(
    Object.keys(PERSONAS).map((key) => [key, 0]),
  ) as Record<PersonaKey, number>

  for (const question of questions) {
    const selected = question.options.find((option) => option.id === answers[question.id])
    if (!selected) continue

    for (const [key, score] of Object.entries(selected.scores)) {
      scores[key as PersonaKey] += score ?? 0
    }
  }

  return scores
}

export function assignPersona(
  answers: Record<string, AnswerValue>,
  questions: Question[] = QUESTIONS,
): PersonaKey {
  const scores = calculatePersonaScores(answers, questions)
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
  questions: Question[] = QUESTIONS,
): number {
  const comparable = questions.filter((question) => a[question.id] && b[question.id])
  if (comparable.length === 0) return 0
  const same = comparable.filter((question) => a[question.id] === b[question.id]).length
  return same / comparable.length
}

export function buildParticipantResult(
  participantId: string,
  responses: ResponseRecord[],
  questions: Question[] = QUESTIONS,
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
      similarity: calculateSimilarity(current.answers, response.answers, questions),
    }))

  if (comparisons.length === 0) {
    return { persona: assignPersona(current.answers, questions), soulmates: [], opposites: [] }
  }

  const similarities = comparisons.map((item) => item.similarity)
  const max = Math.max(...similarities)
  const min = Math.min(...similarities)

  return {
    persona: assignPersona(current.answers, questions),
    soulmates: comparisons.filter((item) => item.similarity === max),
    opposites: comparisons.filter((item) => item.similarity === min),
  }
}

export function buildResultSnapshot(
  responses: ResponseRecord[],
  questions: Question[] = QUESTIONS,
): ResultSnapshot {
  const complete = responses.filter((response) => response.is_complete)
  const participantResults = Object.fromEntries(
    complete.map((response) => [
      response.participant_id,
      buildParticipantResult(response.participant_id, complete, questions),
    ]),
  )

  return {
    groupStats: calculateGroupStats(complete, questions),
    participantResults,
  }
}
