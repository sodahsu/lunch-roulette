export type SessionStatus = 'open' | 'locked' | 'revealed'

export type AnswerValue = string

export interface QuestionOption {
  id: string
  label: string
  emoji: string
  scores: Partial<Record<PersonaKey, number>>
}

export type QuestionCategory =
  | 'alignment'
  | 'effort'
  | 'value'
  | 'adventure'
  | 'social'
  | 'identity'

export interface Question {
  id: string
  category: QuestionCategory
  prompt: string
  required: boolean
  options: QuestionOption[]
}

export type PersonaKey =
  | 'peacekeeper'
  | 'contrarian'
  | 'picky'
  | 'adventurer'
  | 'valueHunter'
  | 'homebody'
  | 'foodFanatic'
  | 'easygoing'
  | 'glutton'
  | 'orderCaptain'

export interface PersonaDefinition {
  key: PersonaKey
  emoji: string
  name: string
  tagline: string
}

export interface Participant {
  id: string
  session_id: string
  user_id: string
  display_name: string
  completed_at: string | null
}

export interface ResponseRecord {
  session_id: string
  participant_id: string
  answers: Record<string, AnswerValue>
  is_complete: boolean
  updated_at: string
}

export interface GroupQuestionStat {
  questionId: string
  counts: Record<string, number>
  sampleSize: number
}

export interface DinnerSuccessResult {
  score: number
  verdict: string
  detail: string
}

export interface PairingResult {
  participantId: string
  similarity: number
}

export interface ParticipantResult {
  persona: PersonaKey
  // 頂級稀有卡；舊資料沒有這個欄位，視為 false
  rare?: boolean
  // 稀有判定的原因；純機率，與作答內容無關，如實寫出
  rareReason?: string
  soulmates: PairingResult[]
  opposites: PairingResult[]
}

export interface ResultSnapshot {
  groupStats: GroupQuestionStat[]
  participantResults: Record<string, ParticipantResult>
}
