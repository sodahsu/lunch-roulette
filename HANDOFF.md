---
title: "Lunch Roulette MVP｜AI 工作交接"
date: "2026-09-29"
handoff_status: ready_for_handoff
---

# Lunch Roulette MVP｜AI 工作交接

## Resume Here

**交付定位：**給本機 Codex 接手執行與驗證。這份文件是目前狀態快照，不代表未執行測試已經通過。

- 目標與交付物：完成可在手機上操作的多人飲食人格遊戲 MVP，使用 Vue 3 + Vite + TypeScript + Supabase；OpenSpec、真實資料流、RLS、Realtime、單元測試與交接文件都留在 repo。
- 非目標：目前不做真實餐廳 API、地圖、會員、好友、正式商用高併發架構。
- 本次已做：OpenSpec、Vue 手機介面、Supabase schema/RLS/Realtime、真實資料寫入驗證、refresh 恢復、逐題儲存、domain unit test cases、GPT 生圖提示詞。
- 本次未做：本環境無法解析 github.com，因此 npm install / unit test / typecheck / build / Playwright 尚未實際跑完。
- 第一個安全動作：在本機切到最新 main，執行依賴安裝與驗證指令；若失敗，先修第一個實際錯誤，再重跑。
- 停止條件：不要在 unit/typecheck/build 尚未通過前宣稱 OpenSpec 驗證完成；不要刪除 migration 或放寬 RLS 來繞過測試。

```yaml
handoff_purpose: implementation_and_verification
task_state: in_progress
code_changed: true
repository_reverified: true
approval_evidence: "使用者已要求合併到主分支，並要求本機 Codex 接手執行"
```

## 交接狀態

| 類別 | 內容 | 來源／範圍 |
|---|---|---|
| Completed（本次實際工作） | OpenSpec、Vue MVP、Supabase live schema、RLS、Realtime publication、DB trigger、真實資料 smoke test、單元測試案例 | repo + Supabase project `hvaxoopyccwsqmhjnibg` |
| In Progress | unit/typecheck/build/e2e 實跑；Anonymous Sign-ins Dashboard 開關；群體 Reveal 視覺 | OpenSpec tasks |
| UNKNOWN | 本機安裝依賴後是否有 TypeScript / Vitest / Vite 編譯問題 | 必須在本機跑驗證取得 |
| PENDING | Anonymous Sign-ins 是否已手動啟用 | Supabase Dashboard |

## Acceptance Metrics

| 驗收項目 | 方法／證據 | 結果 | 缺口 |
|---|---|---|---|
| 真實資料可寫入 | Supabase SQL 實際 insert session / participants / responses | PASS | 無 |
| response 完成狀態 trigger | `is_complete=true` 後 `completed_at` 自動更新 | PASS | 無 |
| participant 隱私 | participant 看 2 位成員但只看自己的 1 份 response | PASS | 無 |
| host 權限 | host 可讀 hosted room 全部 responses | PASS | 無 |
| outsider 權限 | outsider participants/responses 都為 0 | PASS | 無 |
| locked 後改答案 | DB update affected rows = 0 | PASS | 無 |
| locked 後加入 | RLS 回 42501 | PASS | 無 |
| Supabase Security Advisor | security lints | PASS | 0 warnings |
| unit tests | `npm run test:unit` | NOT_RUN | 執行環境 DNS 無法解析 github.com |
| typecheck | `npm run typecheck` | NOT_RUN | 同上 |
| build | `npm run build` | NOT_RUN | 同上 |
| Playwright | `npm run test:e2e` | NOT_RUN | Anonymous Auth + 可執行前端環境 |

## Evidence Classification 與證據

### E01｜Supabase 專案已建立並有 live schema

- 分類：FACT
- 主張：Supabase project `lunch-roulette` 已建立，project ref `hvaxoopyccwsqmhjnibg`，region `ap-northeast-1`，status 曾確認為 `ACTIVE_HEALTHY`。
- 來源：Supabase connector 本次實際操作。
- migration：`initial_lunch_roulette`、`security_hardening`、`restrict_join_to_open_sessions`。
- 本次複核：PASS

### E02｜資料庫授權規則實測

- 分類：FACT
- 主張：participant 只能讀自己的 response；host 可讀 hosted room responses；outsider 看不到 room participants/responses；locked 後不能更新 response 或加入 participant。
- 來源：本次 Supabase SQL 角色模擬。
- 本次複核：PASS

### E03｜單元測試案例已寫但未實跑

- 分類：FACT
- 主張：`src/domain/domain.test.ts` 已涵蓋 completeness、group stats、persona deterministic/tie-break、similarity、self exclusion、highest/lowest、ties、single participant、snapshot incomplete exclusion、participant-id distinctness、snapshot stability。
- 來源：repo `src/domain/domain.test.ts`。
- 本次複核：內容已檢查；runtime NOT_RUN。
- 阻擋原因：目前執行環境 `Could not resolve host: github.com`，無法 clone/install。

## 決策、批准與保護約束

| 決策／待裁決事項 | 狀態 | 原因與證據 |
|---|---|---|
| 約 8 人不是硬上限 | APPROVED | 使用者明確要求不要鎖死 8 人 |
| Reveal 前可修改答案 | APPROVED | 使用者要求不要只能送一次 |
| 主持人手動 lock/reveal | APPROVED | OpenSpec 與實作一致 |
| 真資料而非靜態 mock | APPROVED | 使用者明確要求 |
| 手機優先、單手操作 | APPROVED | 使用者明確要求 |
| persona 最終名稱/分數 | PARTIAL | v0.1 已實作，但正式版本仍可再調 |
| Anonymous Sign-ins | PENDING_RUNTIME | 前端依賴 `signInAnonymously()`，Dashboard 必須啟用 |

### Stable Architecture References／禁止動的項目

| 約束 | 為什麼需要保留 | 正式來源 |
|---|---|---|
| `sessions.status` 是流程狀態單一真相源 | 避免 UI 自己判定 lock/reveal | `openspec/changes/lunch-roulette-mvp/design.md` |
| domain logic 保持 pure functions | 可單獨 unit test，不綁 Supabase | `src/domain/domain.ts` |
| 個人答案與個人結果不能公開給全房 | 隱私邊界 | RLS + OpenSpec |
| Reveal 後使用 persisted result | refresh 不應重抽人格 | OpenSpec result-reveal |

## Next Action

| # | 具體動作 | 範圍／位置 | 預期產出／如何驗證 |
|---|---|---|---|
| 1 | 更新本機 main | repo root | `git switch main && git pull` |
| 2 | 安裝依賴 | repo root | `npm install`，產生並提交 lockfile（若尚無） |
| 3 | 跑 unit test | repo root | `npm run test:unit` 全綠 |
| 4 | 跑 typecheck | repo root | `npm run typecheck` 通過 |
| 5 | 跑 build | repo root | `npm run build` 通過 |
| 6 | 若 Anonymous 尚未啟用，開啟 | Supabase Authentication → Providers | `signInAnonymously()` 可成功 |
| 7 | 跑兩瀏覽器/兩手機 E2E | app | 開房 → 加入 → 逐題儲存 → 改答案 → lock → reveal → refresh |
| 8 | 跑 Playwright | repo root | `npm run test:e2e` |
| 9 | 更新 OpenSpec tasks | `openspec/changes/lunch-roulette-mvp/tasks.md` | 只有實際 PASS 才勾選 |
| 10 | OpenSpec archive readiness review | `openspec/changes/lunch-roulette-mvp` | 未驗證項目不可 archive |

### 本機 Codex 建議直接執行

```bash
git switch main
git pull
npm install
npm run test:unit
npm run typecheck
npm run build
```

若任何一步失敗：
1. 保留第一個有意義的 error。
2. 做最小修正。
3. 重跑失敗項。
4. 全綠後再跑下一項。

## Workspace Provenance

| 快照 | repo／位置 | branch／HEAD 或版本 | 狀態 |
|---|---|---|---|
| 原始 main | `sodahsu/lunch-roulette` | `1d7f21d61cc4c36338c7c61aa0b30e2ed4bea81e` | 初始 README |
| 實作分支 | 同 repo | `feat/lunch-roulette-mvp`，建立 HANDOFF 前最新已知 HEAD `21a9b6ba5fd3e4c72f8b9622afaf754e84a1e3c8` | ahead of main |
| Supabase | project ref `hvaxoopyccwsqmhjnibg` | live cloud DB | schema/RLS 已套用 |

## 交付與驗證備註

- 此次交付變更：OpenSpec + Vue MVP + Supabase live integration + RLS migrations + database smoke tests + domain unit test cases + image prompts + 本交接檔。
- 實際執行的檢查：Supabase schema/RLS/security/database flow PASS；GitHub diff review 已執行。
- 未執行的驗證：npm install、Vitest runtime、typecheck、Vite build、Playwright。
- 本機執行阻擋證據：`fatal: unable to access 'https://github.com/...': Could not resolve host: github.com`。
- 文件交付判定：READY_FOR_HANDOFF
- 執行授權：使用者已要求合併到主分支，並要求本機 Codex 接續執行。
