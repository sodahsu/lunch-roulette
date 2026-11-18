# 飯局資料保留／清理與 RLS 驗證計畫（Issue #43）

## 目前能確認
- `sessions`、`participants`、`responses`、`result_snapshots`、`participant_results` 存在 PostgreSQL RLS。
- 以 `sessions` 為父表的關聯目前已設定 `ON DELETE CASCADE`：**刪除場次時可同步刪除其依附紀錄**。
- 尚無由產品負責人核准的保留期限，也尚未建立定時清理 Job；**不得自行選擇天數或對正式資料庫做刪除**。

## 待決策：保留期限（不在本 PR 啟用）
- 選項 A：揭曉後 7 天清理（資料最少，但分享連結很快失效）
- 選項 B：揭曉後 30 天清理（暫作評估基準，非已核准政策）
- 選項 C：揭曉後 90 天清理（方便回顧，增加長期資料量）
- 未揭曉或逾期未完成場次，需要另訂 TTL（例如建立後 7 天）；不可永遠殘留測試房間。
- 清理前需確認使用者認知：分享連結到期後應顯示友善訊息，而非把資料復原或自動公開。

## 可執行 RLS 負向測試（只對獨立測試專案）
1. 先完成 #42 隔離測試 Supabase 的 Schema、RLS、Auth 與 Realtime 設定。
2. 由測試管理者取得專用 PostgreSQL 連線字串，**不得放入 Git、Issue 或 PR**。
3. 在安全終端設定 `E2E_SUPABASE_URL` 與 `E2E_POSTGRES_URL`；專案 ref 必須一致且不同於 Production。
4. 執行 `node scripts/run-isolated-rls.mjs`。此工具會對應 project ref，再用 psql 執行 SQL；輸入 DB 密碼只透過子程序環境變數，不出現在 CLI 參數。
5. SQL 使用 `BEGIN`、`ROLLBACK` 建立暫時房間，驗證 participant 僅能看自己的答案、outsider 無權、host 不能跨房、locked 後不能改答案與加入。

## 上線前必需
- [ ] 確認實際資料保存天數與公開隱私聲明
- [ ] 經審查的 migration / 定時 cleanup 與回滾計畫
- [ ] 隔離資料庫真實 RLS 測試 PASS（不得只看 Vitest 靜態測試）
- [ ] 真實分享網址過期 UX、多人同步／舊房回歸測試
- [ ] 由負責人明確核准後才可變更正式 Supabase

> 本變更僅交付負向驗證工具與政策決策稿，不會新增或啟動定時刪除，不對 Production 寫資料。
