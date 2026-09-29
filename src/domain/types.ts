export type SessionStatus = 'open' | 'locked' | 'revealed'

export type AnswerValue = string

export interface QuestionOption {
  id: string
  label: string
  emoji: string
  scores: Partial<Record<PersonaKey, number>>
}

export interface Question {
  id: string
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

export interface PairingResult {
  participantId: string
  similarity: number
}

export interface ParticipantResult {
  persona: PersonaKey
  soulmates: PairingResult[]
  opposites: PairingResult[]
}

export interface ResultSnapshot {
  groupStats: GroupQuestionStat[]
  participantResults: Record<string, ParticipantResult>
}
