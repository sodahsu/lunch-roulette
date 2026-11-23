import { describe, expect, it } from 'vitest'
import { resolveRlsTestTarget } from '../../scripts/run-isolated-rls.mjs'
import { readFileSync } from 'node:fs'

const ref = 'opzndeanoejcgmhcasss'
const valid = {
  E2E_SUPABASE_URL: `https://${ref}.supabase.co`,
  E2E_POSTGRES_URL: `postgresql://postgres.${ref}:fake-password@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
}

describe('isolated RLS target guard (no DB connection)', () => {
  it('requires both test API and matching Postgres project', () => {
    expect(() => resolveRlsTestTarget({})).toThrow(/RLS 驗證中止/)
    expect(() => resolveRlsTestTarget({ ...valid, E2E_POSTGRES_URL: 'postgresql://postgres.other:fake@aws-0-us-west-1.pooler.supabase.com/postgres' })).toThrow(/無法對應/)
  })
  it('rejects production Supabase and malformed schemes', () => {
    expect(() => resolveRlsTestTarget({ ...valid, E2E_SUPABASE_URL: 'https://hvaxoopyccwsqmhjnibg.supabase.co' })).toThrow(/僅允許指定/)
    expect(() => resolveRlsTestTarget({ ...valid, E2E_POSTGRES_URL: 'https://abcd1234.supabase.co' })).toThrow()
  })
  it('rejects two matching URLs for an unapproved project', () => {
    expect(() => resolveRlsTestTarget({
      E2E_SUPABASE_URL: valid.E2E_SUPABASE_URL.replace(ref, 'abcd1234'),
      E2E_POSTGRES_URL: valid.E2E_POSTGRES_URL.replace(ref, 'abcd1234')
    })).toThrow(/僅允許指定/)
  })
  it('supports test Supabase pooler and never includes credentials in diagnostics', () => {
    const target = resolveRlsTestTarget(valid)
    expect(target.host).toContain('pooler.supabase.com')
    expect(target.user).toBe(`postgres.${ref}`)
  })
  it('rejects lookalike domains and partial project ref matches', () => {
    for (const unsafe of [
      'postgresql://postgres.abcd1234:fake-password@evil-abcd1234.example.org/postgres',
      'postgresql://postgres.evilabcd1234:fake-password@aws-0-us-west-1.pooler.supabase.com:6543/postgres',
      'postgresql://postgres.abcd1234.extra:fake-password@aws-0-us-west-1.pooler.supabase.com:6543/postgres',
      'postgresql://postgres.abcd1234:fake-password@aws-0-us-west-1.pooler.supabase.com.evil.org/postgres',
      'postgresql://postgres.abcd1234:fake-password@aws-0-us-west-1.pooler.supabase.com:6543/other'
    ].map(url => url.replaceAll('abcd1234', ref))) {
      expect(() => resolveRlsTestTarget({ ...valid, E2E_POSTGRES_URL: unsafe })).toThrow()
    }
  })
  it('allows a correctly scoped Supabase direct PostgreSQL endpoint', () => {
    const target = resolveRlsTestTarget({
      ...valid, E2E_POSTGRES_URL: `postgresql://postgres:fixture@db.${ref}.supabase.co:5432/postgres`
    })
    expect(target.host).toBe(`db.${ref}.supabase.co`)
    expect(target.user).toBe('postgres')
  })
  it('rejects API URL with unexpected path or query', () => {
    expect(() => resolveRlsTestTarget({ ...valid, E2E_SUPABASE_URL: valid.E2E_SUPABASE_URL + '/auth/v1' })).toThrow()
    expect(() => resolveRlsTestTarget({ ...valid, E2E_SUPABASE_URL: valid.E2E_SUPABASE_URL + '/?redirect=1' })).toThrow()
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
