# Design

- Playwright config 在 import 階段呼叫純函式 `requireIsolatedE2EEnvironment`，測試開始前就失敗。
- 測試變數只使用 `E2E_SUPABASE_URL`、`E2E_SUPABASE_PUBLISHABLE_KEY`，webServer 子程序收到對應 VITE_ 變數；既有正式 fallback 仍供一般網站運作。
- 禁止 `reuseExistingServer`，避免沿用其他專案或正式設定的 Vite server。
- GitHub Actions 用兩個 repository Secrets，未設定時預期 E2E gate 為紅；後續需建立獨立 Supabase 測試專案、配置 migrations / RLS / Realtime，完成 CI 才可合併。
- 避免在 PR body、日誌、artifact 打印 key；publishable key 雖可公開，仍保持集中配置。
