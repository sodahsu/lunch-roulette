# Prelaunch API smoke

Date: 2026-10-01 (Asia/Taipei)  
Baseline: `bab2aa51bdd416b52f6b7463cf870c3717e49e5b`

## Scope

- Direct Supabase API checks against synthetic rooms and anonymous identities created by this run.
- No service-role key, deployment, schema change, or source change.
- URL and publishable key are read from the fallback literals in `src/lib/supabase.ts`; the script never prints them.

## Execution

- Script: `node test-results/prelaunch-tests/rls-smoke.mjs`
- Exit: 0
- Assertions: 18/18 PASS（sign-in、偽造 host / user_id 被拒、跨人讀寫隔離、host 可讀全部 responses、outsider 零可見、非 host 無法 lock / 寫 snapshot、lock 後 join 與寫入被拒）
- Synthetic rows: 1 個 session、2 位 participant、2 筆 response 殘留於正式專案（anon 角色無 DELETE policy）；房號以 `ZZ` 開頭，可由 DB owner 清除。

## Deployment inspection

- `.vercel/project.json` identifies project `lunch-roulette`.
- Local Vercel CLI: 未安裝（依指示不安裝）；改用 GitHub Deployments API。
- Production deployment 對應 `bab2aa5`（= 目前 `main` HEAD），state `success`（2026-09-30T17:02Z）。
- HTTP：production deployment URL 與 `https://lunch-roulette.vercel.app/` 皆回 200。
- 未驗證：Vercel project 的 env 設定與 domain alias 歸屬（CLI 不可用）。
