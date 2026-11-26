# Design

- 測試工具先檢查 E2E Supabase API ref 與 PostgreSQL pooler/direct 連線身分相符，拒絕正式 project ref。
- 測試 SQL 在單一 transaction 內建立三名玩家、兩房，切換 authenticated JWT claim 測試 RLS；最後 rollback。
- 目前只在擁有隔離 DB 的受授權 CI/本機執行。獨立測試專案建立前不將其當作通過證據。
- 補一支 forward migration，讓 authenticated 角色取得應用程式所需的表級權限，再由 RLS 決定可見與可寫的資料列。不授予 anon 或 DELETE 權限。
- 移除 security hardening 後重新出現的舊加入政策，僅保留開放房間才可新加入的限制。正式環境原有玩家重連不受此 INSERT 政策影響，但鎖定或已揭曉場次將無法新增玩家。此 migration 部署到正式庫前需負責人另行批准。
- 2026-11-27 決定已揭曉場次以 `revealed_at` 起算 30 天、未揭曉場次以 `created_at` 起算 30 天。Migration 建立受限的 SECURITY DEFINER 刪除函式，並用 Supabase `pg_cron` 每日 03:00 UTC 排程；唯讀 dry-run 單獨列出兩種場次計數。回滾取消排程並移除函式，不還原已刪資料。
- 清理函式及排程只在隔離資料庫演練；正式資料庫不可連線或套用。正式環境套用前需將 dry-run 結果交由負責人確認。

- RLS runner 對 Direct `db.<ref>.supabase.co` + `postgres`、Pooler `*.pooler.supabase.com` + `postgres.<ref>` 做 exact match；拒絕只包含相同字串的假主機、錯誤資料庫名稱與其他 URL 參數。
- `psql` 子程序移除可能覆蓋連線目標的 libpq 環境變數，保留必要 PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD/PGSSLMODE。
