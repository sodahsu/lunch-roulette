# 飯局資料保留、清理與 RLS 驗證（#43）

## 資料保留與分享連結
- 負責人於 2026-11-27 核准：已揭曉場次從 `revealed_at` 起算 30 天；未揭曉場次從 `created_at` 起算 30 天。每日 03:00 UTC 排程清理，正好滿 30 天即符合清理條件。正式環境套用 migration 前仍須由負責人確認 dry-run 計數。
- 場次被清理時，其參加者資料、問卷作答、團體結果和個人結果會一併刪除。一般玩家無法取得其他玩家的逐題答案；主持人可讀取自己的場次作答以計算結果。
- 場次不存在或已被清理時，分享連結會回到加入畫面，提示「連結可能已過期」並請使用者確認房號或聯絡主持人重開。不會恢復資料或公開結果。

## 隔離驗證
由管理者將 `E2E_SUPABASE_URL` 和 `E2E_POSTGRES_URL` 注入環境變數，不寫入 Git 或輸出。安裝 `psql` 後執行 `node scripts/run-isolated-rls.mjs` 與 `node scripts/run-isolated-rls.mjs retention`。兩者都只接受 `opzndeanoejcgmhcasss`，使用 TLS，在交易內造資料並回滾。斷言失敗時 `psql` 非零退出；PR 的 CI 不會跳過未配置的 SQL 步驟。

## 排程與正式操作
`supabase/migrations/20261127_schedule_expired_session_cleanup.sql` 建立 `public.delete_expired_sessions()`，並以 Supabase `pg_cron` 每日 03:00 UTC 執行。已揭曉場次依 `revealed_at` 判斷；`open` 或 `locked` 場次依 `created_at` 判斷。刪除 `sessions` 後，五張關聯資料表依外鍵 cascade 清除。只可將 migration 套用至隔離資料庫作為演練；正式環境需負責人另行確認 dry-run 結果並批准套用。

唯讀預覽位於 `openspec/changes/data-retention-rls/dry-run-expired-sessions.sql`，分開回報已揭曉、未揭曉及總數。回滾檔 `supabase/rollback/20261127_schedule_expired_session_cleanup.sql` 只取消排程並移除函式，不會還原已刪除資料。

1. 套用 migration 前，先執行唯讀 dry-run，將三個計數交給負責人確認；確認備份與還原方式及操作人員權限。
2. migration 會安裝函式並立即啟用每日排程；不可先在正式環境試跑 migration。先在隔離資料庫執行 `node scripts/run-isolated-rls.mjs retention`，確認 31 天資料刪除、29 天資料保留、cascade 與重跑冪等。
3. 作業日誌只記 UTC 時間、耗時、刪除場次數及交易結果。不記房號、玩家資料或憑證；首次執行後確認排程歷史中的實際刪除筆數。
4. 回滾僅停止後續排程並移除函式，已提交刪除無法用 SQL 回滾。若須復原，先停止作業，再以核准備份於隔離庫演練，按場次及外鍵順序還原資料，避免覆寫同期新增資料。

正式部署 RLS 權限 migration 和啟用清理是各自獨立的批准事項，均不在本次隔離驗證範圍內。
