/** Playwright 啟動前的資料庫隔離閘門；不得在 E2E 過程回退正式 Supabase。 */
const PRODUCTION_HOST = 'hvaxoopyccwsqmhjnibg.supabase.co'

export function requireIsolatedE2EEnvironment(env: Record<string, string | undefined>) {
  const rawUrl = env.E2E_SUPABASE_URL?.trim()
  const key = env.E2E_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!rawUrl || !key) {
    throw new Error('E2E 已中止：請設定獨立測試專案的 E2E_SUPABASE_URL 與 E2E_SUPABASE_PUBLISHABLE_KEY（不可使用正式 Supabase）')
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('E2E 已中止：E2E_SUPABASE_URL 不是有效的 HTTPS Supabase 網址')
  }
  if (parsed.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(parsed.hostname) ||
      parsed.username || parsed.password || parsed.port || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('E2E 已中止：測試專案網址須為 https://<project-ref>.supabase.co')
  }
  if (parsed.hostname === PRODUCTION_HOST) {
    throw new Error('E2E 已中止：測試專案與正式 Supabase 相同，禁止執行會寫入資料的 E2E')
  }
  return {
    VITE_SUPABASE_URL: parsed.origin,
    VITE_SUPABASE_PUBLISHABLE_KEY: key
  }
}
