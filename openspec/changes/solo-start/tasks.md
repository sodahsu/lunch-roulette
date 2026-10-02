# Tasks: solo-start

> 本 change 已有主要實作與測試碼。以下 checklist 只在有 source / CI / runtime 證據時勾選；未勾選不代表一定沒有程式碼，可能代表仍缺 E2E、Realtime、RLS 或 runtime 驗證。Full E2E 目前仍被 CASE-01 timeout 阻塞。

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

- [ ] 新增 Host 可建立／恢復自己 participant identity 的 failing test。
- [x] 單人 complete 的 domain contract 已有 coverage：Persona scoring deterministic，且 group success 不可算。
- [x] 2+ complete provisional group preview 已有 unit coverage，並驗證使用正式同一 dinner-success algorithm。
- [x] incomplete participant 不進 provisional aggregate 已有 unit coverage。
- [x] latest answers 改變後 provisional preview 重算已補 UT-SOLO-06。
- [x] provisional food sample / latest food-avoid 重算已補 unit coverage；food consensus pure function 既有 coverage 保留。
- [x] CASE-20 已存在，用於 late join 不重置第一人與 2+ provisional preview；full-suite runtime 尚未 PASS。
- [x] CASE-01 / CASE-21 已存在，用於兩段 Reveal 與 Host-as-participant final result；full-suite runtime 尚未 PASS。
- [ ] 新增 Host-as-participant privacy regression case。

## 2. Session / identity implementation

- [ ] Host lobby 提供「我先玩」入口。
- [ ] Host auth user 可在同一 session 建立或恢復自己的 participant。
- [ ] 避免同一 host 重複建立 participant。
- [ ] Host control role 與 participant role 可在 UI 中切換／返回。
- [ ] QR / 房號在 open provisional hub 持續可分享。
- [ ] 第二位與後續 participant 可正常加入。
- [ ] late join 不重置既有 participant identity / response / progress。
- [ ] locked / revealed late-join restriction 維持不變。

## 3. Provisional result implementation

- [ ] open + complete participant 顯示自己的 provisional persona。
- [ ] provisional persona 不寫入 `participant_results`。
- [ ] participant 修改答案後 provisional persona 重新推導。
- [ ] complete count < 2 時 group success 顯示單人狀態，不顯示 0%。
- [ ] complete count >= 2 時使用既有 algorithm 顯示 provisional success。
- [ ] provisional success 明確標示「目前局勢／尚未鎖定」。
- [ ] provisional group preview 不寫入 `result_snapshots`。
- [ ] Realtime 有效樣本改變時更新 provisional preview。
- [ ] 公開 preview 不顯示 per-person answers。

## 4. Food consensus implementation

- [ ] 1 位有效 participant 時顯示「你目前可以吃」。
- [ ] 2+ 位有效 participants 時顯示「目前大家都能吃」。
- [ ] 未回答 `food-avoid` 的 participant 不進 provisional food sample。
- [ ] food-avoid 修改後 provisional consensus 更新。
- [ ] final Reveal 仍使用既有 persisted food aggregate contract。

## 5. UI / pacing

- [ ] Landing / Host create flow 支援「建立後立即自己玩」。
- [ ] 單人 provisional result hub。
- [ ] 單人 hub 保留分享 QR / 房號。
- [ ] 多人加入時顯示局勢更新 cue。
- [ ] joined / completed count 更新。
- [ ] 飯局難度只依 joined count 呈現，與 scoring 解耦。
- [ ] 375 / 768 / desktop responsive。
- [ ] focus / keyboard / reduced-motion 不 regression。
- [ ] Provisional 與 Final 視覺標示足夠清楚，避免把暫時結果誤認為正式 Reveal。

## 6. Final Reveal regression

- [ ] Host lock 後 provisional preview 停止更新。
- [ ] locked answers 仍不可修改。
- [ ] Stage A 正式 success rate 仍重新由 locked responses 計算。
- [ ] Stage B 才 persist group snapshot / participant results。
- [ ] final persisted persona 取代 provisional persona。
- [ ] incomplete participant 維持無 persona。
- [ ] single-participant final reveal 仍不建立 pairing。
- [ ] rare-card / pairing / food-consensus 既有行為不 regression。

## 7. Verification

- [x] `pnpm test:unit`（GitHub Actions run #18：新增 Solo domain regression tests 後 PASS）
- [x] `pnpm typecheck`（GitHub Actions run #18 PASS）
- [x] `pnpm build`（GitHub Actions run #18 PASS）
- [ ] `pnpm test:e2e`
- [ ] 1 人 → 2 人 → 3+ 人 Realtime smoke。
- [ ] Host 同時是 participant 的多瀏覽器 smoke。
- [ ] locked / revealed late join smoke。
- [ ] privacy / RLS regression。
- [x] `openspec validate solo-start --strict`（GitHub Actions run #18 PASS）
- [x] README 已改為 `IMPLEMENTATION PRESENT / VALIDATION BLOCKED`，並連到 `docs/solo-start-test-plan.md`；最終 runtime PASS 後仍需再更新 release-ready 狀態。

## 7.1 Codex remaining

非 Codex 前置已完成：測試計劃、requirement traceability、Solo domain regression tests、README 狀態同步，以及 unit / typecheck / build / OpenSpec strict gate。

Codex 接手只需處理下列執行／除錯工作：

- [ ] 依 `docs/solo-start-test-plan.md` 的 CASE-01 checkpoints 定位 240000ms timeout 的最後一個 PASS 狀態。
- [ ] 修正 CASE-01 root cause；不得以單純增加 timeout、arbitrary sleep 或無證據 polling fallback 掩蓋。
- [ ] targeted CASE-01 PASS。
- [ ] full Playwright CASE-01～21 PASS。
- [ ] 1 → 2 → 3+ Realtime runtime smoke PASS。
- [ ] Host-as-participant multi-browser smoke PASS。
- [ ] locked / revealed late-join regression PASS。
- [ ] privacy / RLS regression PASS。
- [ ] 依最終證據更新本 tasks / HANDOFF，完成 archive readiness review。

測試依據：`docs/solo-start-test-plan.md`。不要重寫產品規格或另外建立第二套測試口徑。

## 7.2 Branch / deployment gate

- [x] 建立 `dev` 作為日常開發／整合分支。
- [x] PR #5 改為 `task/solo-start → dev`。
- [x] `vercel.json` 已限制只有 `main` Git deployment；`dev` / PR / feature branches 不部署。
- [ ] Codex 完成 CASE-01 / full E2E / runtime / RLS 後，先整合 `task/solo-start → dev`。
- [ ] 在 `dev` 上做整合驗證。
- [ ] 只有 `dev` 整合驗證通過後，才建立／更新 `dev → main` production PR。
- [ ] 只有 merge `main` 才進 Vercel Production。

## 8. Archive gate

- [ ] 所有已確認 Requirements 實作完成。
- [ ] 所有驗證通過。
- [x] NEEDS_CONFIRMATION 已依目前 implementation baseline 解決或明確移出 scope。
- [ ] capability delta 與 code 無 contract drift。
- [ ] 再把已驗證行為 archive / merge 到 `openspec/specs/`。

**Current verdict: IMPLEMENTATION PRESENT / VALIDATION BLOCKED（CASE-01 E2E timeout）**


## 9. Release gate

- [ ] 功能實作完成後將 App version 設為 `0.2.0-rc.1`。
- [ ] 建立對應 RC tag：`v0.2.0-rc.1`。
- [ ] RC 上完成 unit / typecheck / build / E2E / runtime smoke。
- [ ] 若 RC 需修正，以 `rc.2`、`rc.3` 依序遞增，不覆寫既有 tag。
- [ ] `task/solo-start → dev` 整合並驗證完成後，確認 `openspec/specs/`、README 與 runtime 已同步。
- [ ] 建立 `dev → main` production PR；合併 `main` 後將 App version 更新為 `0.2.0`。
- [ ] 建立 immutable Git tag `v0.2.0`。
- [ ] 建立 GitHub Release `v0.2.0`，release notes 至少包含玩法變更、相容性、驗證摘要與已知限制。
