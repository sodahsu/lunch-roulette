import { calculateFoodAvoidStat } from './foods'
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

const DINNER_SUCCESS_ALGORITHM_BY_QUESTIONNAIRE: Record<string, 'v1'> = {
  'v0.1': 'v1',
  'v0.2': 'v1',
}

function calculateDinnerSuccessRateV1(stats: GroupQuestionStat[]): DinnerSuccessResult {
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

export function calculateDinnerSuccessRate(
  stats: GroupQuestionStat[],
  questionnaireVersion = 'v0.2',
): DinnerSuccessResult {
  const algorithmVersion = DINNER_SUCCESS_ALGORITHM_BY_QUESTIONNAIRE[questionnaireVersion]
  if (algorithmVersion !== 'v1') {
    throw new Error(`Unsupported dinner-success algorithm for questionnaire version: ${questionnaireVersion}`)
  }

  return calculateDinnerSuccessRateV1(stats)
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

// 各人格在本局題目中能拿到的最高分；用來把分數換算成「達成率」，
// 否則選項多、配分廣的人格（如真・都可以）會壓過其他人格
export function calculateMaxPersonaScores(questions: Question[] = QUESTIONS): Record<PersonaKey, number> {
  const max = Object.fromEntries(
    Object.keys(PERSONAS).map((key) => [key, 0]),
  ) as Record<PersonaKey, number>

  for (const question of questions) {
    for (const key of Object.keys(max) as PersonaKey[]) {
      max[key] += Math.max(0, ...question.options.map((option) => option.scores[key] ?? 0))
    }
  }

  return max
}

export function assignPersona(
  answers: Record<string, AnswerValue>,
  questions: Question[] = QUESTIONS,
): PersonaKey {
  const scores = calculatePersonaScores(answers, questions)
  const max = calculateMaxPersonaScores(questions)
  const rate = (key: PersonaKey) => (max[key] > 0 ? scores[key] / max[key] : 0)
  const priority = new Map(PERSONA_PRIORITY.map((key, index) => [key, index]))
  const ranked = (Object.keys(scores) as PersonaKey[]).sort((a, b) => {
    const delta = rate(b) - rate(a)
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

export const RARE_CARD_RATE = 0.03
export const RARE_CARD_GUARANTEE_REASON = '本場每人都抽了 3% 的籤但沒人中，所以系統保底：從全場挑出抽籤結果最接近中籤的你。你是被保底選中的，跟你答了什麼無關。'
export const RARE_CARD_REASON = `揭曉時系統幫每個人抽一次 ${Math.round(RARE_CARD_RATE * 100)}% 的籤，你抽中了。跟你答了什麼無關，純屬運氣。`

function rareFields(participantId: string): { rare: boolean; rareReason?: string } {
  return isRareCard(participantId) ? { rare: true, rareReason: RARE_CARD_REASON } : { rare: false }
}

// 以參加者 ID 雜湊出 [0,1) 的抽籤值；同一人重算永遠同一個值，ID 為隨機 UUID 所以等同抽獎
export function rareRoll(participantId: string): number {
  let hash = 2166136261
  for (const char of `rare-card:${participantId}`) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 2 ** 32
}

export function isRareCard(participantId: string): boolean {
  return rareRoll(participantId) < RARE_CARD_RATE
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
    return { persona: assignPersona(current.answers, questions), ...rareFields(participantId), soulmates: [], opposites: [] }
  }

  const similarities = comparisons.map((item) => item.similarity)
  const max = Math.max(...similarities)
  const min = Math.min(...similarities)

  return {
    persona: assignPersona(current.answers, questions),
    ...rareFields(participantId),
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

  // 每一場至少要有一張稀有卡：沒人抽中時，保底給抽籤值最小（最接近中籤）的人；平手取 ID 較小者以維持可重現
  const hasRare = Object.values(participantResults).some((result) => result.rare)
  if (!hasRare && complete.length > 0) {
    const [lucky] = complete
      .map((response) => response.participant_id)
      .sort((a, b) => rareRoll(a) - rareRoll(b) || (a < b ? -1 : 1))
    if (lucky) {
      participantResults[lucky] = {
        ...participantResults[lucky]!,
        rare: true,
        rareReason: RARE_CARD_GUARANTEE_REASON,
      }
    }
  }

  // 忌口彙總附在題目統計之後；沒人填（舊場次）就不附，結果頁據此隱藏區塊
  const foodStat = calculateFoodAvoidStat(complete)
  return {
    groupStats: [...calculateGroupStats(complete, questions), ...(foodStat ? [foodStat] : [])],
    participantResults,
  }
}
