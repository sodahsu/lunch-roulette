# Tasks: solo-start

> 本 change 目前只完成規格；下列實作與驗證任務全部保持未完成。

## 0. Product decisions

- [x] 定義方向：不是獨立 Solo mode，而是同一 session 允許 1 人先開始、之後成長到 N 人。
- [x] 不新增 session status；沿用 `open / locked / revealed`。
- [x] open provisional result 不 persist 成正式 result。
- [x] final Reveal 仍重新從 locked source of truth 建立正式結果。
- [x] 只有 1 位 complete participant 時不硬算 group success percentage。
- [x] 只有 1 位 complete participant 時不建立 pairing。
- [ ] NEEDS_CONFIRMATION：首頁 / Host CTA 最終文案。
- [ ] NEEDS_CONFIRMATION：open provisional success 顯示精確百分比或只顯示趨勢。
- [ ] NEEDS_CONFIRMATION：未來是否設計獨立 Solo 指標；目前不納入本 change。

## 1. Contract tests first

- [ ] 新增 Host 可建立／恢復自己 participant identity 的 failing test。
- [ ] 新增單人 complete 時 provisional persona 可算、group success 不可算的 failing test。
- [ ] 新增 2+ complete provisional group preview 的 failing test。
- [ ] 新增 incomplete participant 不進 provisional aggregate 的 failing test。
- [ ] 新增答案修改後 provisional preview 重算的 failing test。
- [ ] 新增 provisional food consensus 的 failing test。
- [ ] 新增 late join 不重置既有 participant 的 E2E failing case。
- [ ] 新增 provisional → locked → persisted final result 的 E2E failing case。
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

- [ ] `pnpm test:unit`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm test:e2e`
- [ ] 1 人 → 2 人 → 3+ 人 Realtime smoke。
- [ ] Host 同時是 participant 的多瀏覽器 smoke。
- [ ] locked / revealed late join smoke。
- [ ] privacy / RLS regression。
- [ ] `openspec validate solo-start --strict`
- [ ] README 與實際 runtime 狀態一致。

## 8. Archive gate

- [ ] 所有已確認 Requirements 實作完成。
- [ ] 所有驗證通過。
- [ ] NEEDS_CONFIRMATION 已解決或明確移出 scope。
- [ ] capability delta 與 code 無 contract drift。
- [ ] 再把已驗證行為 archive / merge 到 `openspec/specs/`。

**Current verdict: SPEC READY / IMPLEMENTATION NOT STARTED**


## 9. Release gate

- [ ] 功能實作完成後將 App version 設為 `0.2.0-rc.1`。
- [ ] 建立對應 RC tag：`v0.2.0-rc.1`。
- [ ] RC 上完成 unit / typecheck / build / E2E / runtime smoke。
- [ ] 若 RC 需修正，以 `rc.2`、`rc.3` 依序遞增，不覆寫既有 tag。
- [ ] 合併 `main` 前確認 `openspec/specs/`、README 與 runtime 已同步。
- [ ] 合併 `main` 後將 App version 更新為 `0.2.0`。
- [ ] 建立 immutable Git tag `v0.2.0`。
- [ ] 建立 GitHub Release `v0.2.0`，release notes 至少包含玩法變更、相容性、驗證摘要與已知限制。
