# Prelaunch verification report

Date: 2026-10-01 (Asia/Taipei)  
Baseline: `bab2aa51bdd416b52f6b7463cf870c3717e49e5b`

## Results

- 對 `bab2aa5` 重跑：unit 33/33、`vue-tsc -b` + build 通過、E2E 18/18 通過（首次冷啟動 CASE-01 逾時 1 次，重跑全過，判定為 dev server 冷啟動 flake，未再現）。UI 手動 QA 見 `docs/prelaunch-ui.md`。
- Direct API RLS smoke: 18/18 PASS，見 `docs/prelaunch-tests.md`。
- Deployment state: GitHub Deployments 顯示 Production 對 `bab2aa5` success；production deployment 專屬 URL HTTP 200，且對該 URL 跑 E2E CASE-01 / 05 / 06 / 11 / 12 共 5 項全過（建房、多人加入、lock、reveal、refresh、再開一局）。`lunch-roulette.vercel.app` 是他人的韓文專案，不是本專案的網址，不可當作本專案證據。本專案對外網址為 `https://lunch-roulette-xi.vercel.app/`，bundle（`index-oDuHK6uc.js`）與上述 deployment 相同，CASE-01 / 12 在此網址通過。Vercel CLI 不可用，env 設定 UNKNOWN。

## Findings and release decision

- P0: 無
- P1: 無
- P2: 測試殘留列無法由 anon 清除；Vercel env / alias 未驗證
- Go/no-go: GO（附帶條件：上線前確認 Vercel env 與 domain alias）。
