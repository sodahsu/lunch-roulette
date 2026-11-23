# 工作項目

- [x] 先新增分享卡欄位隱私測試（人格卡欄位白名單、團體卡不含暱稱、樣本不足不產生團體卡），再實作純函式。
- [x] 人格卡 canvas 畫入人格插圖與 SSR 外框，載入失敗時退回純文字。
- [x] 新增團體成功率卡 canvas，並在結果頁提供下載／Web Share 按鈕。
- [x] `index.html` 補 og／twitter 標籤、`public/` 放 1200×630 預覽圖與 favicon。
- [x] Playwright：示意結果頁的按鈕與下載、CASE-01 的正式流程下載、連結預覽 meta 與靜態資源。
- [x] 執行 typecheck、單元測試、e2e、build 與 OpenSpec strict；保存 375／1440 截圖。

驗證紀錄：typecheck、單元測試（含新增分享卡欄位隱私測試）、build、OpenSpec strict 皆 exit 0；Playwright CASE-01～26 共 26 項全過（含連 Supabase 的正式流程）。
