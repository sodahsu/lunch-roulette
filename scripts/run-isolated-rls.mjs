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
  // Direct: db.<ref>.supabase.co；Pooler: username=postgres.<ref>
  const identity = `${db.hostname}/${decodeURIComponent(db.username)}`.toLowerCase()
  if (!identity.includes(ref) || identity.includes(PRODUCTION_REF)) {
    throw new Error('RLS 驗證中止：資料庫連線資訊無法對應測試專案 ref')
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
    const result = spawnSync('psql', [
      '-X', '-v', 'ON_ERROR_STOP=1',
      '-f', fileURLToPath(new URL('../tests/db/rls-negative-smoke.sql', import.meta.url))
    ], {
      stdio: 'inherit',
      env: { ...process.env, PGHOST: target.host, PGPORT: target.port, PGDATABASE: target.database,
        PGUSER: target.user, PGPASSWORD: target.password, PGSSLMODE: 'require' }
    })
    if (result.error) throw new Error('無法執行 psql；請在隔離環境安裝 PostgreSQL CLI')
    process.exitCode = result.status ?? 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'RLS 測試未能執行')
    process.exitCode = 1
  }
}
