---
title: "Lunch Roulette《都可以？》Solo Start｜AI 工作交接"
date: "2026-10-02"
handoff_status: ready_for_handoff
---

# Lunch Roulette《都可以？》Solo Start｜AI 工作交接

## Resume Here

**交付定位：**供下一個 Agent 接手 `task/solo-start` 的實作驗證與除錯。這份文件是狀態快照，不代表 Solo Start 已驗收完成，也不授權直接 merge、建立 Release/tag 或忽略失敗測試。

- 目標與交付物：讓同一個 Lunch Roulette session 支援「1 人先開局 → 朋友後加入 → open 階段 provisional Persona / group preview → 最後沿用正式兩段式 Reveal」，並做到 unit / typecheck / build / OpenSpec / E2E / runtime 驗證可通過。
- 非目標：不新增獨立 Solo session type、不改掉 `open → locked → revealed`、不把單人結果硬算成群體成功率、不放寬 participant 讀取他人 response/result 的隱私邊界、不在驗證失敗時建立正式 Release。
- 本次已做／未做：遠端 feature branch 已存在實作、測試、OpenSpec、README 與 CI workflow；本次交接只重整 `HANDOFF.md`。最新 CI 的 unit / typecheck / build / OpenSpec strict 已 PASS，但 E2E FAIL，因此整體尚未完成。
- 第一個安全動作：從 CI run `36890053375` 的 CASE-01 timeout 開始定位，不先重寫 Solo Start；先確認 timeout 前最後一個未完成的 UI / Realtime 等待條件，再做最小修正並重跑 CASE-01。
- 停止條件：若接手時 `task/solo-start` HEAD 已不是本文件記錄的 implementation baseline、PR base 已改變、或 main 已前進造成 contract drift，先重新 compare / read specs，不沿用本文件的「目前」描述。

```yaml
handoff_purpose: implementation_and_validation
task_state: implementation_present_validation_blocked
code_changed: true
repository_reverified: true
implementation_baseline_before_handoff_commit: 0ac31a6b0bda6d1fa0c63977a52dd42802d01599
approval_evidence: user_requested_continue_until_self_test_complete_then_requested_handoff_first
```

## 交接狀態

| 類別 | 內容 | 來源／範圍 |
|---|---|---|
| Completed（本次直接查核） | `task/solo-start` 相對 `main` ahead 35 / behind 0；PR #5 為 draft、open、mergeable；14 個 changed files。 | GitHub compare + PR #5，implementation baseline `0ac31a6...` |
| Completed（本次直接查核） | Branch 已包含 Solo Start source、domain test、E2E、OpenSpec、README 與 `.github/workflows/solo-start-ci.yml`。 | GitHub compare；實際讀取 `src/domain/domain.ts`、`src/domain/domain.test.ts`、`src/lib/session-service.ts`、`tests/e2e/lunch-roulette.spec.ts` |
| Completed（CI） | Unit 35/35 PASS、typecheck PASS、build PASS、OpenSpec strict validation PASS。 | CI run `36890053375` / job `110463088445` |
| In Progress / BLOCKED | Full E2E 尚未通過。CASE-01 在 240000 ms timeout；其餘 20 tests 未執行。 | 同一 CI job log |
| In Progress / DOCUMENT DRIFT | README 與 `openspec/changes/solo-start/tasks.md` 仍寫「尚未實作 / IMPLEMENTATION NOT STARTED」，但 branch 已有實作與測試；不能把這兩段狀態文字當目前真相。 | README / tasks vs branch diff / source / CI |
| PENDING_DECISION | Release versioning 文件已有 `v0.2.0-rc.1 → v0.2.0` 方案，但尚未證明使用者已核准這組實際版本號。 | README / tasks；使用者僅詢問是否可有 release 版本標籤 |
| UNKNOWN | 本機 worktree dirty/clean、真機 / 多裝置 runtime smoke、目前是否存在 Git tag。 | 本次只查 GitHub 遠端 branch / CI；未查本機 |
| FACT | GitHub Releases 頁目前回傳空集合。 | GitHub releases page 查核 |

## Acceptance Metrics

| 驗收項目 | 基準及來源 | 目標及來源 | 方法／證據位置 | 結果 | 缺口／前置條件 |
|---|---|---|---|---|---|
| 單人可由 Host 直接開局 | OpenSpec `solo-start` + CASE-19 | Host 成為第一位 participant、完成後可看 provisional persona | Playwright CASE-19 + runtime smoke | NOT_FULLY_VERIFIED | CASE-19 在 full suite 中尚未執行，因 CASE-01 先 timeout |
| 第二人後加入不重置第一人 | OpenSpec + CASE-20 | joined=2、第一人保留 provisional state，第二人 complete 後 host 顯示 provisional success | CASE-20 | NOT_FULLY_VERIFIED | Full suite 未跑到 CASE-20 |
| Host-as-participant 正式 Reveal | OpenSpec + CASE-21 | Host 保留 control room，仍可查看自己正式 persona；guest 正常翻牌 | CASE-21 | NOT_FULLY_VERIFIED | Full suite 未跑到 CASE-21 |
| Domain provisional preview | `buildProvisionalGroupPreview()` | 1 complete 不算 group success；2+ 用既有 success algorithm | Vitest | PASS | CI 35/35 |
| Type safety | 專案既有 gate | `vue-tsc -b` 無錯 | CI | PASS | 無 |
| Production build | 專案既有 gate | Vite build 成功 | CI | PASS | 無 |
| OpenSpec change 格式 | `openspec/config.yaml` / change `solo-start` | strict validation 通過 | `pnpm dlx @fission-ai/openspec validate solo-start --strict --no-interactive` | PASS | 無 |
| Full E2E regression | 原有 CASE-01～18 + 新增 CASE-19～21 | 全部 PASS | `pnpm test:e2e` | FAIL | CASE-01 timeout；20 tests did not run |
| README / tasks 狀態一致 | 文件應反映 code + validation 真實狀態 | 不再寫「未實作」；需標示 implementation present / E2E blocked | 文件 review | FAIL | 尚未同步 |
| Release | 使用者希望有版本標籤 | 只有驗證 gate 通過後才建立 RC / 正式 release | tag / GitHub Release | NOT_RUN | 版本號尚待明確批准；GitHub Releases 目前無資料 |

## Evidence Classification 與證據

### E01｜Branch 與 PR 現況

- 分類：FACT
- 主張：`task/solo-start` 以 `main@80cddbe8e1eb3eb6c1131ffe2ec46c0f3db3ea95` 為 merge base，在本次交接查核時 ahead 35 / behind 0；PR #5 為 draft、open、mergeable，head 為 `0ac31a6b0bda6d1fa0c63977a52dd42802d01599`。
- 來源：GitHub compare、PR #5 metadata。
- 時間：2026-10-02 本次查核。
- 本次複核：PASS。
- 缺口：本 `HANDOFF.md` 寫入後會產生新的 handoff-only commit，因此 `0ac31a6...` 是「實作與驗證 baseline」，不是交接寫入後的 branch HEAD。

### E02｜Solo Start 已不是「尚未實作」

- 分類：FACT
- 主張：branch 已包含功能程式與測試，不只是規格。
- 來源：
  - `src/domain/domain.ts`：存在 `buildProvisionalGroupPreview()`。
  - `src/domain/domain.test.ts`：存在 provisional group preview tests。
  - `src/lib/session-service.ts`：存在 `getOwnParticipant()`、`previewOpenGroupStats()`，`joinSession()` 會恢復同一 user 的 participant。
  - `tests/e2e/lunch-roulette.spec.ts`：CASE-19 / 20 / 21 覆蓋 solo host、late join provisional success、host-as-participant final reveal。
  - GitHub compare：`src/App.vue`、`src/styles.css`、session/domain/test files 均有 feature diff。
- 本次複核：PASS（source-level existence）。
- 限制：source 存在不代表 runtime 全部正確；E2E 尚未綠。

### E03｜CI 成功與失敗邊界

- 分類：FACT
- 來源：GitHub Actions run `36890053375`，job `110463088445`。
- Runner：Ubuntu 24.04、Node 22.23.3、pnpm 10.30.3。
- PASS：
  - `pnpm test:unit`：35 tests passed。
  - `pnpm typecheck`。
  - `pnpm build`。
  - `pnpm dlx @fission-ai/openspec validate solo-start --strict --no-interactive`：`Change 'solo-start' is valid`。
- FAIL：
  - `pnpm test:e2e`。
  - CASE-01 timeout 240000 ms。
  - log 最後顯示 error at `closeActors()` / `context.close()`，但這是 timeout 後 cleanup 位置，**不能直接判定 closeActors 是根因**。
  - 1 failed / 20 did not run。
- Artifact：`playwright-test-results`，artifact ID `11176632212`。
- 本次複核：PASS（讀取 workflow job 與完整 log）。
- 下一步證據：下載 artifact / error-context，或針對 CASE-01 單跑並記錄 timeout 前最後一個 await。

### E04｜文件狀態漂移

- 分類：FACT
- 主張：README 仍標 `Planned: Solo-start（規格完成、尚未實作）`；tasks 仍大量 unchecked 並寫 `SPEC READY / IMPLEMENTATION NOT STARTED`。這與 branch source / CI 事實不一致。
- 來源：`README.md`、`openspec/changes/solo-start/tasks.md` 與 E02/E03。
- 本次複核：PASS。
- 影響：在修正文件前，不應 archive OpenSpec change，也不應把 README 當 release readiness 依據。

### E05｜Release / tag 狀態

- 分類：FACT + PENDING_DECISION
- FACT：README / tasks 已記錄建議方案 `v0.2.0-rc.1`、`v0.2.0`；GitHub Releases 查核為空集合。
- PENDING_DECISION：目前沒有足夠批准證據證明這組實際版本號已定案，也沒有建立 Release 的授權／驗證條件成立證據。
- Tags：UNKNOWN；本次工具未成功列出 tags，因此不得宣稱「沒有 tag」。
- 保護條件：E2E 未綠前不要建立正式 `v0.2.0` Release；是否建立 RC tag 也應先確認版本號方案與 gate。

## 決策、批准與保護約束

| 決策／待裁決事項 | 狀態 | 原因與證據 | 批准者及紀錄 | 適用範圍／重開條件 |
|---|---|---|---|---|
| Solo Start 是同一 session 從 1 人長成 N 人，不是獨立 Solo mode | CONFIRMED_IN_SPEC | `openspec/changes/solo-start/proposal.md` / `design.md` | 使用者要求新增單人可開局，規格已落檔 | 若產品方向改為獨立 solo game 才重開 |
| Session status 不新增值 | CONFIRMED_IN_SPEC | 仍用 `open / locked / revealed` | OpenSpec | DB state model 改變時重開 |
| 1 complete 不顯示 group success % | CONFIRMED_IN_SPEC | 避免把單人資料冒充群體共識 | OpenSpec + unit test | 若未來另定 Solo 指標，必須是不同 contract |
| Participant provisional persona 僅自己可見；group provisional preview 留在 Host control room | CONFIRMED_IN_SPEC | 保持 privacy / RLS boundary | design + README | RLS / role model 改變時重開 |
| `v0.2.0-rc.1 → v0.2.0` release scheme | PENDING_DECISION | 已寫入 README/tasks，但缺少明確定案證據 | 未記錄 | 使用者明確批准版本號後 |
| Merge PR #5 | BLOCKED | Full E2E FAIL、docs drift 未修 | 尚未批准 merge | E2E 綠 + docs/spec 狀態同步 |
| Archive `solo-start` 到 `openspec/specs/` | BLOCKED | Archive gate 尚未成立 | OpenSpec 規則 | 實作與驗證全部完成後 |

### Stable Architecture References／禁止改壞

| 約束 | 為什麼需要保留 | 正式來源及查核狀態 |
|---|---|---|
| 正式 Reveal 仍是 `open → locked → revealed` | Solo preview 不能變成新的 persistence state | `openspec/changes/solo-start/design.md`，已讀 |
| Provisional result 不寫入正式 `participant_results` / `result_snapshots` | 避免暫時資料污染正式結果 | proposal / design，已讀 |
| Final result 從 locked source of truth 重建 | 避免 race / stale client preview | design，已讀 |
| 一般 participant 不讀其他人的 responses | 保持 privacy / RLS boundary | design，已讀 |
| Host 同時當 participant 不代表可讀其他人的 private result | role 與 private result ownership 分離 | design，已讀 |
| 少於 2 complete 不顯示 group success percentage | 現有成功率是群體共識遊戲分數 | design + unit test，已查 |
| 正式 Release 不從未驗證 feature branch 建立 | 避免把失敗 CI 的版本當正式版 | README release section；版本號仍待批准 |

## Next Action

> 以下是接手順序，不代表本交接文件自動授權執行 merge / release。

| # | 具體動作 | 範圍／位置 | 依賴與所需證據 | 批准條件 | 預期產出／如何驗證 |
|---|---|---|---|---|---|
| 1 | 定位 CASE-01 timeout | `tests/e2e/lunch-roulette.spec.ts`、CI artifact `11176632212` | 讀 error-context；必要時單跑 CASE-01 | 屬既有「做到自行測試完成」工作範圍 | 找到 timeout 前實際卡住的 await / state，不把 cleanup line 誤判為根因 |
| 2 | 做最小修正並只重跑 CASE-01 | App / session-service / test helper 中實際 owner | E01～E03 | 不改產品 contract | CASE-01 PASS |
| 3 | 重跑 full gate | branch / PR #5 | CASE-01 已穩定 | 無額外批准 | unit / typecheck / build / OpenSpec / E2E 全 PASS |
| 4 | 補 runtime smoke | 1→2→3+、Host-as-participant、多 browser | 自動化 gate 全綠 | 無額外批准 | 具體 smoke evidence，不只看 test code |
| 5 | 修 README / tasks 狀態漂移 | `README.md`、`openspec/changes/solo-start/tasks.md` | 以實際驗證結果更新，不先勾未驗證項 | 無額外批准 | 文件與 runtime / CI 一致 |
| 6 | Review OpenSpec archive readiness | `openspec/changes/solo-start/` | 所有 gate 通過 | archive 前確認 change 無 NEEDS_CONFIRMATION 阻塞 | strict validate + capability/code drift review |
| 7 | 決定 Release 版本號 | README/tasks release section | 使用者確認 `v0.2.0-rc.1 / v0.2.0` 是否採用 | **需使用者明確定案** | 版本策略確認 |
| 8 | Merge / tag / GitHub Release | PR #5 / main | tests + docs + OpenSpec 全綠 | **需 merge/release 授權** | main 固定 commit + immutable tag + release notes |

## Workspace Provenance

| 快照 | repo／位置 | branch／HEAD 或版本 | 時間與來源 | worktree／資料狀態 |
|---|---|---|---|---|
| main baseline | `sodahsu/lunch-roulette` | `main@80cddbe8e1eb3eb6c1131ffe2ec46c0f3db3ea95` | GitHub compare，2026-10-02 | 遠端 commit；本機 worktree 未查 |
| implementation baseline | 同 repo | `task/solo-start@0ac31a6b0bda6d1fa0c63977a52dd42802d01599` | PR #5 / CI，2026-10-02 | 遠端 branch；本機 worktree 未查 |
| PR | 同 repo | `#5` draft / open / mergeable | GitHub PR metadata | 35 commits、14 changed files；尚未 merge |

| 變更歸屬 | 檔案／位置 | 狀態 | 來源及處理限制 |
|---|---|---|---|
| Solo Start feature branch | `.github/workflows/solo-start-ci.yml`、README、OpenSpec、`src/App.vue`、domain/session-service/styles、domain/E2E tests | 已存在於遠端 branch | 不 reset / force-rewrite；先依 PR diff 與 CI 修正 |
| 本次交接 | `HANDOFF.md` | 本次更新 | handoff-only；不代表 code validation |
| 本機既存變更 | UNKNOWN | 未查核 | 接手若使用本機，先 `git status` / `git worktree list`，不得自行丟棄 |

## 額外發現（未納入本次交接修改）

- CI 使用 `actions/checkout@v4`、`actions/setup-node@v4`、`actions/upload-artifact@v4` 時出現「Node.js 20 deprecated / forced Node.js 24」warning；本次沒有把它當 E2E failure 根因，也沒有升級 actions。
- `README.md` 的 Verification 仍描述「CASE-01～18」，但 feature branch E2E 已新增 CASE-19～21；這也是文件漂移的一部分。
- Release 頁目前空白；tag 清單本次未成功查核。

## 交付與驗證備註

- 此次交付變更：只更新 `HANDOFF.md`，把 Solo Start branch / PR / CI / docs drift / release pending 狀態整理成可接手快照。
- 實際執行的檢查：
  - GitHub compare `main...task/solo-start`。
  - PR #5 metadata。
  - 讀取 README、OpenSpec tasks/design、CI workflow。
  - 讀取 domain / session-service / E2E feature source。
  - 讀取 CI run `36890053375` job steps 與 logs。
  - 查 GitHub Releases 頁（空集合）。
- 未執行的驗證：
  - 本次沒有重跑任何 test。
  - 沒有下載 Playwright artifact。
  - 沒有查本機 worktree/status。
  - 沒有真機 / 多裝置 smoke。
  - 沒有建立、移動或刪除任何 Git tag / Release。
- repo 規範／validator：CI 實際執行 OpenSpec strict validation PASS；本次交接沒有再次執行 validator。
- 文件交付判定：**READY_FOR_HANDOFF**。
- 判定理由：接手者可從明確的 CASE-01 blocker 開始，不需要猜 branch、PR、驗證狀態、文件漂移或 release gate；未驗證事項均已標示。
- 執行授權：歷史對話中使用者曾要求「繼續做到你自己測試完成」，之後要求「先寫交接檔」。本次只做交接；merge / archive / tag / GitHub Release 仍需在相應 gate 成立並取得必要批准後處理。
