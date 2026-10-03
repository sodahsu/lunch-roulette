# Tasks: solo-start

> 本 change 已有主要實作與測試碼。以下 checklist 只在有 source / CI / runtime 證據時勾選；未勾選不代表一定沒有程式碼，可能代表仍缺 E2E、Realtime、RLS 或 runtime 驗證。CASE-01 timeout 已於 2026-10-03 修正（`5ed419b`），full E2E 與 runtime smoke 已通過。

## 0. Product decisions

- [x] 定義方向：不是獨立 Solo mode，而是同一 session 允許 1 人先開始、之後成長到 N 人。
- [x] 不新增 session status；沿用 `open / locked / revealed`。
- [x] open provisional result 不 persist 成正式 result。
- [x] final Reveal 仍重新從 locked source of truth 建立正式結果。
- [x] 只有 1 位 complete participant 時不硬算 group success percentage。
- [x] 只有 1 位 complete participant 時不建立 pairing。
- [x] 本 change Host CTA baseline 採「我先玩」；未來純文案調整不改 domain contract。
- [x] 2+ complete 時 Host Control Room provisional success 顯示精確百分比，並標示尚未鎖定。
- [x] 獨立 Solo 百分比指標明確移出本 change scope；1 complete 不顯示 group success %。

## 1. Contract tests first

- [x] 新增 Host 可建立／恢復自己 participant identity 的 regression test（CASE-22：重新整理後回控制室、participants 仍為 1、暫時人格可恢復）。
- [x] 單人 complete 的 domain contract 已有 coverage：Persona scoring deterministic，且 group success 不可算。
- [x] 2+ complete provisional group preview 已有 unit coverage，並驗證使用正式同一 dinner-success algorithm。
- [x] incomplete participant 不進 provisional aggregate 已有 unit coverage。
- [x] latest answers 改變後 provisional preview 重算已補 UT-SOLO-06。
- [x] provisional food sample / latest food-avoid 重算已補 unit coverage；food consensus pure function 既有 coverage 保留。
- [x] CASE-20 已存在，用於 late join 不重置第一人與 2+ provisional preview；full-suite runtime 尚未 PASS。
- [x] CASE-01 / CASE-21 已存在，用於兩段 Reveal 與 Host-as-participant final result；full-suite runtime 尚未 PASS。
- [x] 新增 Host-as-participant privacy regression case（CASE-23：參加者以自己的 auth 身分只讀得到自己的 response / participant_result；open 時正式結果為 0）。

## 2. Session / identity implementation

- [x] Host lobby 提供「我先玩」入口。（CASE-19；2026-10-03 runtime smoke A）
- [x] Host auth user 可在同一 session 建立或恢復自己的 participant。（CASE-19；2026-10-03 runtime smoke SS-02（重新整理後恢復））
- [x] 避免同一 host 重複建立 participant。（2026-10-03 runtime smoke SS-02：重新整理後 participants 仍為 1）
- [x] Host control role 與 participant role 可在 UI 中切換／返回。（CASE-21；2026-10-03 runtime smoke（重新整理後落在參加者畫面，需按「回主持畫面」））
- [x] QR / 房號在 open provisional hub 持續可分享。（2026-10-03 runtime smoke B/C：暫定預覽期間主持人畫面保留房號與「複製加入連結」，兩人以房號後加入）
- [x] 第二位與後續 participant 可正常加入。（CASE-20；2026-10-03 runtime smoke B/C）
- [x] late join 不重置既有 participant identity / response / progress。（CASE-20；2026-10-03 runtime smoke B）
- [x] locked / revealed late-join restriction 維持不變。（2026-10-03 runtime smoke：locked 與 revealed 各一次，新加入者進不了答題，participant 數不變）

## 3. Provisional result implementation

- [x] open + complete participant 顯示自己的 provisional persona。（CASE-19；2026-10-03 runtime smoke A）
- [x] provisional persona 不寫入 `participant_results`。（2026-10-03 runtime smoke A：open 時 participant_results = 0）
- [x] participant 修改答案後 provisional persona 重新推導。（2026-10-03 runtime smoke：真・都可以 → CP 值守門員）
- [x] complete count < 2 時 group success 顯示單人狀態，不顯示 0%。（CASE-19；2026-10-03 runtime smoke A）
- [x] complete count >= 2 時使用既有 algorithm 顯示 provisional success。（CASE-20；UT-SOLO-03；2026-10-03 runtime smoke B）
- [x] provisional success 明確標示「目前局勢／尚未鎖定」。（CASE-20（「這不是正式結果」）；source：LIVE PREVIEW / 尚未鎖定）
- [x] provisional group preview 不寫入 `result_snapshots`。（2026-10-03 runtime smoke A：open 時 result_snapshots = 0）
- [x] Realtime 有效樣本改變時更新 provisional preview。（2026-10-03 runtime smoke C：未重新整理，100% → 67%）
- [x] 公開 preview 不顯示 per-person answers。（source：open-preview 只渲染成功率、verdict 與食物 chips）

## 4. Food consensus implementation

- [x] 1 位有效 participant 時顯示該 participant 目前可接受的餐點，且不標示為「大家都能吃」（實作文案「目前唯一完成者可以吃」，符合 spec；原 checklist 寫「你目前可以吃」，但主持人控制室裡的唯一完成者不一定是主持人本人。CASE-19 已加斷言）。
- [x] 2+ 位有效 participants 時顯示「目前大家都能吃」。（source：`foodConsensus.sampleSize > 1` 分支）
- [x] 未回答 `food-avoid` 的 participant 不進 provisional food sample。（UT-SOLO-08；2026-10-03 runtime smoke B（未交忌口不計入完成））
- [x] food-avoid 修改後 provisional consensus 更新。（UT-SOLO-09）
- [x] final Reveal 仍使用既有 persisted food aggregate contract。（PR #7/#8 CI full E2E 21/21（CASE-01 揭曉後清單排除 Ben 的火鍋））

## 5. UI / pacing

- [x] Landing / Host create flow 支援「建立後立即自己玩」。（CASE-19）
- [x] 單人 provisional result hub。（CASE-19；2026-10-03 runtime smoke A）
- [x] 單人 hub 保留分享 QR / 房號。（2026-10-03 runtime smoke：主持畫面保留房號與「複製加入連結」）
- [ ] 多人加入時顯示局勢更新 cue。
- [x] joined / completed count 更新。（CASE-20；2026-10-03 runtime smoke B/C）
- [x] 飯局難度只依 joined count 呈現，與 scoring 解耦。（source：`hostDifficulty` 只讀 `participants.length`）
- [ ] 375 / 768 / desktop responsive。
- [ ] focus / keyboard / reduced-motion 不 regression。
- [ ] Provisional 與 Final 視覺標示足夠清楚，避免把暫時結果誤認為正式 Reveal。

## 6. Final Reveal regression

- [x] Host lock 後 provisional preview 停止更新。（2026-10-03 runtime smoke D：鎖定後參加者暫時人格消失）
- [x] locked answers 仍不可修改。（CASE-05）
- [x] Stage A 正式 success rate 仍重新由 locked responses 計算。（CASE-01；2026-10-03 runtime smoke D）
- [x] Stage B 才 persist group snapshot / participant results。（2026-10-03 runtime smoke：Stage A 時 results / snapshots = 0，翻牌後 results = 1）
- [x] final persisted persona 取代 provisional persona。（CASE-21；2026-10-03 runtime smoke（正式人格 = 最後的暫時人格））
- [x] incomplete participant 維持無 persona。（CASE-04）
- [x] single-participant final reveal 仍不建立 pairing。（2026-10-03 runtime smoke：單人揭曉 NO MATCH YET / NO ENEMY YET）
- [x] rare-card / pairing / food-consensus 既有行為不 regression。（PR #7/#8 CI full E2E 21/21（CASE-14/15/16））

## 7. Verification

- [x] `pnpm test:unit`（GitHub Actions run #18：新增 Solo domain regression tests 後 PASS）
- [x] `pnpm typecheck`（GitHub Actions run #18 PASS）
- [x] `pnpm build`（GitHub Actions run #18 PASS）
- [x] `pnpm test:e2e`（PR #7/#8 CI full E2E 21/21；本機 21/21）
- [x] 1 人 → 2 人 → 3+ 人 Realtime smoke。（2026-10-03 runtime smoke A/B/C）
- [x] Host 同時是 participant 的多瀏覽器 smoke。（2026-10-03 runtime smoke：主持人兼參加者 + 2 位參加者）
- [x] locked / revealed late join smoke。（2026-10-03 runtime smoke）
- [x] privacy / RLS regression。（2026-10-03 runtime smoke E：參加者以自己的 token 打 REST，只讀得到自己的 response / participant_result（主持人可讀全場 response 是 MVP 既有 policy））
- [x] `openspec validate solo-start --strict`（GitHub Actions run #18 PASS）
- [x] README 已改為 `IMPLEMENTATION PRESENT / VALIDATION BLOCKED`，並連到 `docs/solo-start-test-plan.md`；最終 runtime PASS 後仍需再更新 release-ready 狀態。

## 7.1 Codex remaining

非 Codex 前置已完成：測試計劃、requirement traceability、Solo domain regression tests、README 狀態同步，以及 unit / typecheck / build / OpenSpec strict gate。

Codex 接手直接以 `dev` 為基準，只需處理下列執行／除錯工作：

- [x] 依 `docs/solo-start-test-plan.md` 的 CASE-01 checkpoints 定位 240000ms timeout 的最後一個 PASS 狀態。（trace：click「鎖定並揭曉」從 16.8s 起等不到按鈕）
- [x] 修正 CASE-01 root cause；不得以單純增加 timeout、arbitrary sleep 或無證據 polling fallback 掩蓋。（`5ed419b`：結果區塊限定 revealed）
- [x] targeted CASE-01 PASS。（本機 + CI）
- [x] full Playwright CASE-01～21 PASS。（PR #7/#8 CI full E2E 21/21）
- [x] 1 → 2 → 3+ Realtime runtime smoke PASS。（2026-10-03 runtime smoke）
- [x] Host-as-participant multi-browser smoke PASS。（2026-10-03 runtime smoke）
- [x] locked / revealed late-join regression PASS。（2026-10-03 runtime smoke）
- [x] privacy / RLS regression PASS。（2026-10-03 runtime smoke）
- [ ] 依最終證據更新本 tasks / HANDOFF，完成 archive readiness review。

測試依據：`docs/solo-start-test-plan.md`。不要重寫產品規格或另外建立第二套測試口徑。

## 7.2 Branch / deployment gate

- [x] 建立 `dev` 作為日常開發／整合分支。
- [x] PR #5 改為 `task/solo-start → dev`，並已合併進 `dev`（merge commit `e9a5c659049dcced887edd6ee50bf2530ad448dc`）。
- [x] `.github/workflows/branch-policy.yml` 阻擋 feature/task branch 直接 PR 到 `main`；production PR 只允許 `dev → main`。
- [x] Solo Start CI 已監聽 `pull_request` 到 `dev` / `main`，並在 `push: dev` 時重跑整合驗證。
- [x] Branch Policy run #2 已在目前 PR base=`dev` 上 PASS。
- [x] `vercel.json` 已限制只有 `main` Git deployment；`dev` / PR / feature branches 不部署。
- [ ] Vercel workspace 目前未列出 `lunch-roulette` project；若後續連線／建立專案，需再驗證 Production Branch = `main`，不得啟用 dev / PR preview deploy。
- [x] `task/solo-start → dev` 已完成整合；Codex 後續直接在 `dev` 修正 CASE-01 / full E2E / runtime / RLS。
- [x] 在 `dev` 上完成整合驗證（CASE-01 / full E2E / runtime / RLS 仍待 Codex）。（PR #7/#8 CI full E2E 21/21 + 2026-10-03 runtime smoke）
- [x] 只有 `dev` 整合驗證通過後，才建立／更新 `dev → main` production PR（PR #10）。
- [x] 只有 merge `main` 才進 Vercel Production（#10 合併後 Vercel production success）。

## 8. Archive gate

- [ ] 所有已確認 Requirements 實作完成。
- [ ] 所有驗證通過。
- [x] NEEDS_CONFIRMATION 已依目前 implementation baseline 解決或明確移出 scope。
- [ ] capability delta 與 code 無 contract drift。
- [ ] 再把已驗證行為 archive / merge 到 `openspec/specs/`。

**Current verdict: VALIDATED ON DEV / ARCHIVE & RELEASE PENDING**

仍未勾選：多人加入 cue、responsive / a11y、Provisional 與 Final 視覺區隔的人工檢查、archive review 與 release 版本號。


## 9. Release gate

- [x] 功能實作完成後將 App version 設為 `0.2.0-rc.1`。
- [x] 建立對應 RC tag：`v0.2.0-rc.1`（指向 `1a0e83f`）。
- [x] RC 上完成 unit / typecheck / build / E2E / runtime smoke（PR #10 CI；2026-10-03 production runtime smoke 兩支全 PASS，房號 84TWBV / SN9HEP）。
- [x] 若 RC 需修正，以 `rc.2`、`rc.3` 依序遞增，不覆寫既有 tag（rc.1 未需修正）。
- [ ] `dev` 的 Solo Start 整合驗證完成後，確認 `openspec/specs/`、README 與 runtime 已同步。
- [x] 建立 `dev → main` production PR（#10，已合併 `a5d17ca`）；App version 更新為 `0.2.0`。
- [ ] 建立 immutable Git tag `v0.2.0`。
- [ ] 建立 GitHub Release `v0.2.0`，release notes 至少包含玩法變更、相容性、驗證摘要與已知限制。
