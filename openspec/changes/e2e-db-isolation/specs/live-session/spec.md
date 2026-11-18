## ADDED Requirements

### Requirement: 自動化 E2E 必須使用獨立測試 Supabase
系統 MUST 在瀏覽器 E2E 建立房間前驗證測試專案 URL 與 key 均存在，且測試專案不得與正式專案相同。若不符 MUST 停止 E2E，不可使用網站一般功能的正式 fallback。

#### Scenario: 未提供測試專案
- **GIVEN** 測試執行者未配置 E2E Supabase URL 或 publishable key
- **WHEN** 啟動 Playwright（包含直接呼叫 Playwright）
- **THEN** MUST 在開啟任何測試房間前失敗，並提示設定隔離專案

#### Scenario: 設定正式專案
- **GIVEN** 測試 URL 指向目前正式 Supabase 專案
- **WHEN** CI 啟動瀏覽器測試
- **THEN** MUST 拒絕執行，不得向正式資料庫寫入測試資料

#### Scenario: 使用獨立測試專案
- **GIVEN** 測試 URL 指向獨立 Supabase 並提供對應 publishable key
- **WHEN** Playwright 建立新測試伺服器
- **THEN** MUST 將獨立測試連線傳給 Vite，且不得重用先前正在運行的正式設定伺服器
