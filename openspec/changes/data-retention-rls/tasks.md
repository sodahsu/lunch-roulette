## Tasks

- [x] RLS 角色／跨房／鎖定後寫入的負向 SQL 腳本
- [x] 專案 ref 與 DB 連線一致性的安全 guard
- [x] 純函式 guard 單元測試與資料保留政策候選方案
- [ ] 配置專用測試 PostgreSQL 並實際執行 SQL
- [ ] 使用者核准資料保留期限，補隱私政策和過期 UX
- [ ] 實作經審查的 cleanup migration/job，提供回滾及監控
- [ ] 多人 E2E 與 RLS 交叉實測，PR Review 之後再考慮合併 dev

## Branch dependency
- [x] 本工作分支包含 #42（隔離測試 Supabase）的程式與 CI guard，防止在 #42 尚未合併時把 E2E 指向正式專案。
- [x] RLS 在獨立 PostgreSQL 上的失敗即紅燈；未配置 E2E_POSTGRES_URL 不可跳過或宣稱成功。
- [ ] 合併順序：先 #44，再 #45；所有 PR 仍由專案負責人審查與核准。
