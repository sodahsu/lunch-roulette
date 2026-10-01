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
- HTTP：production deployment 專屬 URL 回 200，內容為本專案（`zh-Hant`、「都可以？」）。
- 正式站 E2E smoke：對該 URL 跑 CASE-01 / 05 / 06 / 11 / 12，5/5 通過（會在正式 Supabase 留下合成房間）。
- 注意：`https://lunch-roulette.vercel.app/` 是他人的韓文「점심 룰렛」專案，非本專案；本專案對外網址為 `https://lunch-roulette-xi.vercel.app/`（bundle 與 production deployment 相同；CASE-01 / 12 通過）。
- 未驗證：Vercel project 的 env 設定與 domain alias 歸屬（CLI 不可用）。
