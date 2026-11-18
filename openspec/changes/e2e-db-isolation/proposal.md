# E2E 隔離正式資料

## Why
現有 E2E 實際建房、寫入資料，未設定 env 時前端會回退正式 Supabase；CI 可無意中污染正式資料。

## What
Playwright 與 CI 必須先提供獨立測試 Supabase 才能啟動；webServer 不得重用既有服務。單元測試驗證拒絕邏輯。

## Out of scope
不修改正式 app fallback、不套用遠端 DB migration、不替用戶建立 Supabase 專案或 secrets、不修改 main。
