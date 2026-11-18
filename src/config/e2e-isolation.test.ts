import { describe, it, expect } from 'vitest'
import { requireIsolatedE2EEnvironment } from './e2e-isolation'

const testEnv = {
  E2E_SUPABASE_URL: 'https://test-project-123.supabase.co',
  E2E_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture_only'
}

describe('E2E 資料庫隔離閘門', () => {
  it('拒絕兩個測試環境變數都未設定，避免寫入正式資料', () => {
    expect(() => requireIsolatedE2EEnvironment({})).toThrow(/E2E 已中止/)
  })
  it('拒絕正式 Supabase，即使 key 已填也不能繞過', () => {
    expect(() => requireIsolatedE2EEnvironment({
      ...testEnv, E2E_SUPABASE_URL: 'https://hvaxoopyccwsqmhjnibg.supabase.co'
    })).toThrow(/禁止執行/)
  })
  it('拒絕缺 key 與非 HTTPS / 非 Supabase 網域', () => {
    expect(() => requireIsolatedE2EEnvironment({ E2E_SUPABASE_URL: testEnv.E2E_SUPABASE_URL })).toThrow()
    for (const url of ['http://test.supabase.co', 'https://supabase.co.example.org', 'invalid', 'https://test.supabase.co/any']) {
      expect(() => requireIsolatedE2EEnvironment({ ...testEnv, E2E_SUPABASE_URL: url })).toThrow()
    }
  })
  it('允許獨立測試專案，並回傳僅注入子程序的 Vite 變數', () => {
    expect(requireIsolatedE2EEnvironment(testEnv)).toEqual({
      VITE_SUPABASE_URL: testEnv.E2E_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: testEnv.E2E_SUPABASE_PUBLISHABLE_KEY
    })
  })
})
