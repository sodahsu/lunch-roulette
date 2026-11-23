## Tasks

- [x] RLS 角色／跨房／鎖定後寫入的負向 SQL 腳本
- [x] 專案 ref 與 DB 連線一致性的安全 guard
- [x] 純函式 guard 單元測試與資料保留政策候選方案
- [x] 配置專用測試 PostgreSQL 並實跑 RLS SQL；故意破壞斷言確認非零退出
- [x] 記錄核准的 30 天期限，更新隱私和過期連結說明
- [x] 在隔離 DB 驗證手動 cleanup SQL 草案，檢查刪除筆數、外鍵連帶刪除及回滾
- [x] 多人 E2E 與 RLS 交叉實測（CASE-23）
- [ ] 負責人審查 PR 與 cleanup 草案；正式環境套用及排程須另行核准

## Branch dependency
- [x] 本工作分支包含 #42（隔離測試 Supabase）的程式與 CI guard，防止在 #42 尚未合併時把 E2E 指向正式專案。
- [x] RLS 在獨立 PostgreSQL 上的失敗即紅燈；未配置 E2E_POSTGRES_URL 不可跳過或宣稱成功。
- [ ] 合併順序：先 #44，再 #45；所有 PR 仍由專案負責人審查與核准。
