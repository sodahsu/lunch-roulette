import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockAuth, mockFrom, mockChannel, mockRemoveChannel } = vi.hoisted(() => ({
  mockAuth: {
    getSession: vi.fn(),
    signInAnonymously: vi.fn(),
  },
  mockFrom: vi.fn(),
  mockChannel: vi.fn(),
  mockRemoveChannel: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    auth: mockAuth,
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}))

import {
  createCode,
  createSession,
  finalizeReveal,
  SessionNotFoundError,
  MAX_CREATE_SESSION_ATTEMPTS,
  subscribeToSession,
  type SessionRecord,
} from './session-service'

type SubscribeStatusCallback = (status: string) => void

function mockRealtimeChannel() {
  let statusCallback: SubscribeStatusCallback = () => {}
  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn((callback: SubscribeStatusCallback) => {
      statusCallback = callback
      return channel
    }),
  }
  mockChannel.mockReturnValue(channel)
  return { channel, emitStatus: (status: string) => statusCallback(status) }
}

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

      const failure = await createSession(MAX_CREATE_SESSION_ATTEMPTS).catch((error: unknown) => error)

      expect(failure).toBeInstanceOf(Error)
      expect(failure).toMatchObject({
        message: '建立場次失敗：房號一直撞號，請再試一次。',
        cause: { code: '23505' },
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

  describe('subscribeToSession reconnect', () => {
    it('refreshes on the first SUBSCRIBED because changes made before the handshake are not replayed', () => {
      const { emitStatus } = mockRealtimeChannel()
      const onChange = vi.fn()
      const onSubscribed = vi.fn()

      subscribeToSession('session-1', onChange, onSubscribed)
      expect(onChange).not.toHaveBeenCalled()
      emitStatus('SUBSCRIBED')

      expect(onSubscribed).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledTimes(1)
    })

    it('refreshes again on every rejoin because events missed while disconnected are not replayed', () => {
      const { emitStatus } = mockRealtimeChannel()
      const onChange = vi.fn()
      const onSubscribed = vi.fn()

      subscribeToSession('session-1', onChange, onSubscribed)
      emitStatus('SUBSCRIBED')
      emitStatus('CHANNEL_ERROR')
      emitStatus('SUBSCRIBED')
      emitStatus('TIMED_OUT')
      emitStatus('SUBSCRIBED')

      expect(onSubscribed).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledTimes(3)
    })

    it('ignores error states on their own; the SDK rejoin decides when to refresh', () => {
      const { emitStatus } = mockRealtimeChannel()
      const onChange = vi.fn()

      subscribeToSession('session-1', onChange)
      emitStatus('CHANNEL_ERROR')
      emitStatus('TIMED_OUT')

      expect(onChange).not.toHaveBeenCalled()
    })

    it('removes the channel on unsubscribe', () => {
      const { channel } = mockRealtimeChannel()

      const unsubscribe = subscribeToSession('session-1', vi.fn())
      unsubscribe()

      expect(mockRemoveChannel).toHaveBeenCalledWith(channel)
    })
  })
})
