# 工作項目

- [x] 先新增 v0.2 凍結的黃金測試（題庫雜湊、500 房間抽題＋人格摘要），確認在改動前以原程式碼量測並通過。
- [x] 先新增 v0.3 結構、抽題、成功率映射與建立場次的失敗測試，以及人格分布模擬測試。
- [x] 在 `src/domain/questions.ts` 新增 v0.3 題庫（6 類 × 8 題）與版本選題，v0.2 題庫不動。
- [x] 在 `src/domain/domain.ts` 補上 `v0.3` 成功率演算法映射。
- [x] 在 `src/lib/session-service.ts` 讓新場次使用 v0.3。
- [x] 反覆調整配分直到模擬分布達標（v0.3 最高與最低差 1.7 個百分點，v0.2 為 14.6），結果寫進 PR。
- [x] 執行 `pnpm install --frozen-lockfile`、`pnpm typecheck`、`pnpm test:unit`、`pnpm build`、`pnpm test:e2e` 與 OpenSpec strict 驗證。（結果見 PR）
- [x] 以 375 與 1440 寬度截圖 v0.3 答題畫面，存到 `/tmp/lunch-enrich/`。
- 不納入本次：README、HANDOFF 與 `docs/` 仍描述 v0.2 的 24 題，因範圍限制只動 `src/domain/` 與 session-service 的版本選擇處，留待後續文件更新。
