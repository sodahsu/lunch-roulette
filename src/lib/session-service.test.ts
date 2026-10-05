import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockAuth, mockFrom } = vi.hoisted(() => ({
  mockAuth: {
    getSession: vi.fn(),
    signInAnonymously: vi.fn(),
  },
  mockFrom: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    auth: mockAuth,
    from: mockFrom,
  },
}))

import {
  createCode,
  createSession,
  finalizeReveal,
  SessionNotFoundError,
  MAX_CREATE_SESSION_ATTEMPTS,
  type SessionRecord,
} from './session-service'

describe('session-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'test-user-123' } } },
    })
  })

  describe('createCode', () => {
    it('generates a 6-character room code from the safe character set', () => {
      const code = createCode()
      expect(code).toHaveLength(6)
      expect(code).toMatch(/^[A-Z2-9]{6}$/)
      // 不應包含易混淆字元 0, 1, I, O
      expect(code).not.toMatch(/[01IO]/)
    })
  })

  describe('SessionNotFoundError', () => {
    it('sets the custom error name and friendly message', () => {
      const error = new SessionNotFoundError('XYZ999')
      expect(error.name).toBe('SessionNotFoundError')
      expect(error.message).toContain('XYZ999')
      expect(error.message).toContain('請確認房號是否正確')
    })
  })

  describe('createSession retry logic', () => {
    it('returns the session directly on first successful insert', async () => {
      const fakeSession = {
        id: 'sess-1',
        code: 'ABCDEF',
        host_user_id: 'test-user-123',
        status: 'open',
        questionnaire_version: 'v0.2',
      }

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: fakeSession, error: null }),
          }),
        }),
      })

      const session = await createSession()
      expect(session).toEqual(fakeSession)
      expect(mockFrom).toHaveBeenCalledTimes(1)
    })

    it('retries when encountering unique violation error (23505) and succeeds', async () => {
      const fakeSession = {
        id: 'sess-2',
        code: 'XYZ123',
        host_user_id: 'test-user-123',
        status: 'open',
        questionnaire_version: 'v0.2',
      }

      let callCount = 0
      mockFrom.mockImplementation(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => {
              callCount += 1
              if (callCount === 1) {
                return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key' } })
              }
              return Promise.resolve({ data: fakeSession, error: null })
            }),
          }),
        }),
      }))

      const session = await createSession()
      expect(session).toEqual(fakeSession)
      expect(callCount).toBe(2)
    })

    it('immediately throws on non-23505 database errors without retry', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } }),
          }),
        }),
      })

      await expect(createSession()).rejects.toMatchObject({ code: '42501' })
      expect(mockFrom).toHaveBeenCalledTimes(1)
    })

    it('throws when retry limit is exhausted', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } }),
          }),
        }),
      })

      await expect(createSession(MAX_CREATE_SESSION_ATTEMPTS)).rejects.toMatchObject({
        code: '23505',
      })
      expect(mockFrom).toHaveBeenCalledTimes(MAX_CREATE_SESSION_ATTEMPTS)
    })
  })

  describe('finalizeReveal resilience', () => {
    it('treats 23505 unique violation in participant_results as successful idempotent insert', async () => {
      const session: SessionRecord = {
        id: 'sess-revealed-1',
        code: 'ABC123',
        host_user_id: 'host-1',
        status: 'locked',
        questionnaire_version: 'v0.2',
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'responses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    session_id: 'sess-revealed-1',
                    participant_id: 'p-1',
                    answers: { 'group-choice': 'follow' },
                    is_complete: true,
                    updated_at: '2026-10-05T00:00:00Z',
                  },
                ],
                error: null,
              }),
            }),
          }
        }
        if (table === 'participants') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'p-1',
                      session_id: 'sess-revealed-1',
                      user_id: 'u-1',
                      display_name: 'Player 1',
                      completed_at: '2026-10-05T00:00:00Z',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'result_snapshots') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'participant_results') {
          return {
            insert: vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } }),
          }
        }
        if (table === 'sessions') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const groupStats = await finalizeReveal(session)
      expect(groupStats).toBeDefined()
      expect(Array.isArray(groupStats)).toBe(true)
    })
  })
})
