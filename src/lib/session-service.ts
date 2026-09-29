import { supabase } from './supabase'
import { buildResultSnapshot, isCompleteResponse } from '../domain/domain'
import type {
  Participant,
  ParticipantResult,
  ResponseRecord,
  SessionStatus,
  GroupQuestionStat,
} from '../domain/types'

export interface SessionRecord {
  id: string
  code: string
  host_user_id: string
  status: SessionStatus
  questionnaire_version: string
}

export async function ensureUserId(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData.session?.user.id) return sessionData.session.user.id

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) throw error ?? new Error('Anonymous sign-in failed')
  return data.user.id
}

function createCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const values = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(values, (value) => chars[value % chars.length]).join('')
}

export async function createSession(): Promise<SessionRecord> {
  const userId = await ensureUserId()
  const { data, error } = await supabase
    .from('sessions')
    .insert({ code: createCode(), host_user_id: userId })
    .select()
    .single()

  if (error) throw error
  return data as SessionRecord
}

export async function getSessionByCode(code: string): Promise<SessionRecord> {
  await ensureUserId()
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (error) throw error
  return data as SessionRecord
}

export async function getOwnParticipant(sessionId: string): Promise<Participant | null> {
  const userId = await ensureUserId()
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Participant | null
}

export async function getOwnResponse(
  sessionId: string,
  participantId: string,
): Promise<ResponseRecord | null> {
  const { data, error } = await supabase
    .from('responses')
    .select('*')
    .eq('session_id', sessionId)
    .eq('participant_id', participantId)
    .maybeSingle()
  if (error) throw error
  return data as ResponseRecord | null
}

export async function joinSession(sessionId: string, displayName: string): Promise<Participant> {
  const userId = await ensureUserId()

  const { data: existing } = await supabase
    .from('participants')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('participants')
      .update({ display_name: displayName, last_seen_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data as Participant
  }

  const { data, error } = await supabase
    .from('participants')
    .insert({ session_id: sessionId, user_id: userId, display_name: displayName })
    .select()
    .single()

  if (error) throw error
  return data as Participant
}

export async function saveAnswers(
  sessionId: string,
  participantId: string,
  answers: Record<string, string>,
): Promise<void> {
  const { error } = await supabase.from('responses').upsert(
    {
      session_id: sessionId,
      participant_id: participantId,
      answers,
      is_complete: isCompleteResponse(answers),
    },
    { onConflict: 'session_id,participant_id' },
  )
  if (error) throw error
}

export async function listParticipants(sessionId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at')
  if (error) throw error
  return data as Participant[]
}

export async function listResponses(sessionId: string): Promise<ResponseRecord[]> {
  const { data, error } = await supabase
    .from('responses')
    .select('*')
    .eq('session_id', sessionId)
  if (error) throw error
  return data as ResponseRecord[]
}

export async function lockSession(session: SessionRecord): Promise<void> {
  if (session.status !== 'open') return

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'locked', locked_at: new Date().toISOString() })
    .eq('id', session.id)
    .eq('host_user_id', session.host_user_id)
    .eq('status', 'open')

  if (error) throw error
}

export async function finalizeReveal(session: SessionRecord): Promise<GroupQuestionStat[]> {
  const responses = await listResponses(session.id)
  const participants = await listParticipants(session.id)
  const snapshot = buildResultSnapshot(responses)

  const { error: groupError } = await supabase
    .from('result_snapshots')
    .upsert(
      { session_id: session.id, group_stats: snapshot.groupStats },
      { onConflict: 'session_id', ignoreDuplicates: true },
    )
  if (groupError) throw groupError

  const resultRows = Object.entries(snapshot.participantResults).flatMap(([participantId, result]) => {
    const person = participants.find((item) => item.id === participantId)
    if (!person) return []
    return [{
      session_id: session.id,
      participant_id: participantId,
      user_id: person.user_id,
      result,
    }]
  })

  if (resultRows.length > 0) {
    const { error: personalError } = await supabase
      .from('participant_results')
      .upsert(resultRows, {
        onConflict: 'session_id,participant_id',
        ignoreDuplicates: true,
      })
    if (personalError) throw personalError
  }

  const { error: revealError } = await supabase
    .from('sessions')
    .update({ status: 'revealed', revealed_at: new Date().toISOString() })
    .eq('id', session.id)
    .eq('host_user_id', session.host_user_id)
    .eq('status', 'locked')

  if (revealError) throw revealError
  return snapshot.groupStats
}

export async function getGroupStats(sessionId: string): Promise<GroupQuestionStat[] | null> {
  const { data, error } = await supabase
    .from('result_snapshots')
    .select('group_stats')
    .eq('session_id', sessionId)
    .maybeSingle()
  if (error) throw error
  return (data?.group_stats as GroupQuestionStat[] | undefined) ?? null
}

export async function getPersonalResult(
  sessionId: string,
  participantId: string,
): Promise<ParticipantResult | null> {
  const { data, error } = await supabase
    .from('participant_results')
    .select('result')
    .eq('session_id', sessionId)
    .eq('participant_id', participantId)
    .maybeSingle()
  if (error) throw error
  return (data?.result as ParticipantResult | undefined) ?? null
}

export function subscribeToSession(sessionId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`session:${sessionId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'responses', filter: `session_id=eq.${sessionId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'result_snapshots', filter: `session_id=eq.${sessionId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'participant_results', filter: `session_id=eq.${sessionId}` }, onChange)
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
