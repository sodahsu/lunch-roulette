# Design

- 測試工具先檢查 E2E Supabase API ref 與 PostgreSQL pooler/direct 連線身分相符，拒絕正式 project ref。
- 測試 SQL 在單一 transaction 內建立三名玩家、兩房，切換 authenticated JWT claim 測試 RLS；最後 rollback。
- 目前只在擁有隔離 DB 的受授權 CI/本機執行。獨立測試專案建立前不將其當作通過證據。
- 資料清理策略尚未核准，故此變更不產生 migration 或 cron。

- RLS runner 對 Direct `db.<ref>.supabase.co` + `postgres`、Pooler `*.pooler.supabase.com` + `postgres.<ref>` 做 exact match；拒絕只包含相同字串的假主機、錯誤資料庫名稱與其他 URL 參數。
- `psql` 子程序移除可能覆蓋連線目標的 libpq 環境變數，保留必要 PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD/PGSSLMODE。
