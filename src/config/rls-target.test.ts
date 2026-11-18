import { describe, expect, it } from 'vitest'
import { resolveRlsTestTarget } from '../../scripts/run-isolated-rls.mjs'
import { readFileSync } from 'node:fs'

const valid = {
  E2E_SUPABASE_URL: 'https://abcd1234.supabase.co',
  E2E_POSTGRES_URL: 'postgresql://postgres.abcd1234:fake-password@aws-0-us-west-1.pooler.supabase.com:6543/postgres'
}

describe('isolated RLS target guard (no DB connection)', () => {
  it('requires both test API and matching Postgres project', () => {
    expect(() => resolveRlsTestTarget({})).toThrow(/RLS 驗證中止/)
    expect(() => resolveRlsTestTarget({ ...valid, E2E_POSTGRES_URL: 'postgresql://postgres.other:fake@aws-0-us-west-1.pooler.supabase.com/postgres' })).toThrow(/無法對應/)
  })
  it('rejects production Supabase and malformed schemes', () => {
    expect(() => resolveRlsTestTarget({ ...valid, E2E_SUPABASE_URL: 'https://hvaxoopyccwsqmhjnibg.supabase.co' })).toThrow(/禁止正式/)
    expect(() => resolveRlsTestTarget({ ...valid, E2E_POSTGRES_URL: 'https://abcd1234.supabase.co' })).toThrow()
  })
  it('supports test Supabase pooler and never includes credentials in diagnostics', () => {
    const target = resolveRlsTestTarget(valid)
    expect(target.host).toContain('pooler.supabase.com')
    expect(target.user).toBe('postgres.abcd1234')
  })
  it('SQL is wrapped in transaction and tests real negative policies', () => {
    const text = readFileSync('tests/db/rls-negative-smoke.sql', 'utf8')
    expect(text).toMatch(/^BEGIN;/m)
    expect(text).toMatch(/^ROLLBACK;/m)
    expect(text).toContain('RLS FAIL: locked response changed')
    expect(text).toContain('RLS FAIL: outsider can read')
    expect(text).toContain('RLS FAIL: late join')
  })
})
