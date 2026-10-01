# 上線前 UI QA

日期：2026-10-01（台灣時間）  
依據：[後端上線檢查](prelaunch-backend.md)

## 範圍與方法

- 使用本機 Vite 與真實 Chromium 153.0.8010.12（Playwright），device scale factor 1。
- 375×844 手機模擬、768×900 平板模擬、1280×900 Host 桌面；不是實體裝置測試。
- 實際建立匿名 Host 房間，兩個獨立匿名參與者加入、完成 12 題並等待；Host 分兩階段揭曉，再開啟即時總覽。
- 十人總覽另以 `?demo=result&view=overview` 在三種寬度檢視；此 demo 不連資料庫。
- 共建立 2 個合成測試房（每房 2 名合成參與者，狀態皆已揭曉）。房號不記錄於報告；截圖遮蔽房號及 QR Code。
- 未重跑 unit、typecheck、build 或完整 E2E；本次僅執行手動瀏覽器 QA 輔助腳本。

## 實際路徑與結果

| 路徑 / 檢查 | Viewport | 結果 |
|---|---:|---|
| Landing、鍵盤 Tab | 375×844 | 通過；Tab 順序為音效、加入飯局、Host；Host 焦點為 2px lime 外框 |
| Join、Quiz、Waiting | 375×844、768×900 | 通過；兩名使用者可加入、作答、交卷並等待 |
| Reveal 第一階段 | Host 1280×900；參與者 375×844、768×900 | 通過；Host 顯示成功率；參與者顯示結算中，尚未顯示人格 |
| Reveal 第二階段 | 參與者 375×844、768×900 | 通過；Host 公開後兩名參與者均看到人格卡 |
| 即時 Host Overview | 1280×900、768×900、375×844 | 通過；兩筆結果可讀，房號於截圖遮蔽 |
| 十人 Demo Overview | 1280×900、768×900、375×844 | 通過；卡片分欄排列，窄螢幕可垂直捲動 |
| Reduced motion | 375×844 | 通過；`prefers-reduced-motion` 生效，抽樣動畫停用、動畫與轉場時長約 0.001ms |
| 水平溢位 | 19 個上述畫面狀態 | 通過；每一狀態 `scrollWidth === viewport width`，溢位 0px，未發現超出元素 |
| Console / network | 三個瀏覽器頁面 | 通過；無 `console.error`、page error、失敗請求或 HTTP 4xx/5xx |

## 缺陷分級

| 級別 | 數量 | 發現 |
|---|---:|---|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 0 | — |

## 截圖

檔案位於 `test-results/prelaunch-ui-20261001/`：

- 手機：`landing-375.png`、`keyboard-focus-375.png`、`join-375.png`、`quiz-375.png`、`waiting-375.png`、`reveal-locked-375.png`、`reveal-persona-375.png`、`reveal-persona-reduced-375.png`。
- 平板：`join-768.png`、`quiz-768.png`、`waiting-768.png`、`reveal-persona-768.png`。
- Host：`reveal-success-1280.png`。
- 即時總覽：`overview-live-1280.png`、`overview-live-768.png`、`overview-live-375.png`。
- 十人總覽：`overview-demo-1280.png`、`overview-demo-768.png`、`overview-demo-375.png`。

## 重現方式

先啟動 `pnpm dev --host 127.0.0.1 --port 4173`，再執行 `node test-results/prelaunch-ui-20261001/qa-prelaunch.mjs`。輔助腳本每次會建立新的匿名測試房與使用者，完成後留在揭曉狀態；不會輸出房號或金鑰。

## UNKNOWN / 本次未涵蓋

- 實體 iOS / Android、Safari、螢幕閱讀器與不同系統鍵盤行為；本次只在 Chromium 模擬 viewport。
- 生產部署、真實手機網路延遲及生產環境錯誤；本次沒有部署。
- 直接呼叫 API 驗證 RLS。此 UI QA 的 Lock 檢查只確認介面狀態；E2E PASS 不等同實機或 RLS 驗證。
- 任務啟動資訊指定 `gpt-6-luna` / `model_reasoning_effort=max`；本次未修改 session 設定。Orca `status` / `agent-context` 與 Node REPL request metadata 未提供可讀取的 model / effort 欄位。
