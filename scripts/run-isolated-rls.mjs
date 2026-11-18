// RLS 僅可對隔離 Supabase 測試專案執行；絕不修改正式 schema。
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const PRODUCTION_REF = 'hvaxoopyccwsqmhjnibg'

export function resolveRlsTestTarget(env = process.env) {
  if (!env.E2E_SUPABASE_URL || !env.E2E_POSTGRES_URL) {
    throw new Error('RLS 驗證中止：需指定 E2E_SUPABASE_URL + E2E_POSTGRES_URL（獨立測試專案）')
  }
  let site, db
  try {
    site = new URL(env.E2E_SUPABASE_URL)
    db = new URL(env.E2E_POSTGRES_URL)
  } catch {
    throw new Error('RLS 驗證中止：連線網址格式無效')
  }
  if (site.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(site.hostname)) {
    throw new Error('RLS 驗證中止：測試 API 必須是 Supabase HTTPS 專案')
  }
  const ref = site.hostname.split('.')[0]
  if (ref === PRODUCTION_REF || !['postgres:', 'postgresql:'].includes(db.protocol)) {
    throw new Error('RLS 驗證中止：禁止正式 Supabase 或非 PostgreSQL')
  }
  // 僅允許 Supabase Direct 或 Pooler 的確切專案身分，禁止字串部分包含造成錯誤連線。
  const user = decodeURIComponent(db.username)
  const direct = db.hostname === `db.${ref}.supabase.co` && user === 'postgres'
  const pooler = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(db.hostname) && user === `postgres.${ref}`
  if (!direct && !pooler) {
    throw new Error('RLS 驗證中止：資料庫連線資訊無法對應測試專案 ref')
  }
  if (site.username || site.password || site.port || site.pathname !== '/' || site.search || site.hash ||
      !/^[a-z0-9]{6,32}$/.test(ref) || db.pathname !== '/postgres' || db.search || db.hash ||
      (db.port && !['5432', '6543'].includes(db.port)) || (direct && db.port && db.port !== '5432')) {
    throw new Error('RLS 驗證中止：API 或 PostgreSQL 連線參數不符合獨立測試專案格式')
  }
  return {
    host: db.hostname,
    port: db.port || '5432',
    database: decodeURIComponent(db.pathname.slice(1) || 'postgres'),
    user: decodeURIComponent(db.username),
    password: decodeURIComponent(db.password),
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const target = resolveRlsTestTarget()
    // 避免繼承 libpq 進階環境變數（例如 PGHOSTADDR）改寫已驗證的目標。
    const isolatedPsqlEnv = { ...process.env, PGHOST: target.host, PGPORT: target.port,
      PGDATABASE: target.database, PGUSER: target.user, PGPASSWORD: target.password, PGSSLMODE: 'require' }
    for (const name of ['PGHOSTADDR', 'PGSERVICE', 'PGSERVICEFILE', 'PGPASSFILE', 'PGOPTIONS']) {
      delete isolatedPsqlEnv[name]
    }
    const result = spawnSync('psql', [
      '-X', '-v', 'ON_ERROR_STOP=1',
      '-f', fileURLToPath(new URL('../tests/db/rls-negative-smoke.sql', import.meta.url))
    ], {
      stdio: 'inherit',
      env: isolatedPsqlEnv
    })
    if (result.error) throw new Error('無法執行 psql；請在隔離環境安裝 PostgreSQL CLI')
    process.exitCode = result.status ?? 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'RLS 測試未能執行')
    process.exitCode = 1
  }
}
