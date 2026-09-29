# Tasks: lunch-roulette-mvp

## 0. Spec gate
- [x] 定義半天 MVP 範圍與非目標
- [x] 定義技術基線與資料 ownership
- [x] 定義 unit test 與 case test 策略
- [x] v0.2 建立 24 題題庫；新房間 deterministic 抽 12 題，6 類各 2 題；舊 v0.1 保留 8 題
- [x] 固定 8 人格、option score、最高分制與 PERSONA_PRIORITY tie-break
- [x] similarity 使用雙方可比較題目的等權答案一致率

## 1. Project scaffold
- [x] 建立 Vue 3 + Vite + TypeScript
- [x] package / script / domain test 已設定 Vitest（runtime 尚未實跑）
- [x] package / config / CASE-01～08 已設定 Playwright（runtime 尚未實跑）
- [x] 設定 Supabase client 與環境變數
- [x] 建立 typecheck / test:unit / test:e2e / build scripts

## 2. Domain tests first
### 2.1 Response completeness
- [x] 先寫：完整 required answers => complete
- [x] 先寫：少一題 => incomplete
- [x] latest response 由 responses PK + upsert 負責，並由 Playwright CASE-03 覆蓋
- [x] 實作最小 completeness logic

### 2.2 Group stats
- [x] 先寫：只計入 complete responses
- [x] 先寫：3 / 8 / 9 人皆可計算
- [x] 先寫：0 complete 不產生 NaN / Infinity
- [x] 實作最小 group stats logic

### 2.3 Persona
- [x] 先寫：相同輸入得到相同 persona
- [x] v0.1 明確不使用 threshold；改驗最高分制與固定 tie-break
- [x] 先寫：score 平手使用固定 tie-break
- [x] 實作 persona scoring / assignment

### 2.4 Similarity
- [x] 先寫：不與自己比較
- [x] 先寫：最高 similarity
- [x] 先寫：最低 similarity
- [x] 先寫：並列保留全部
- [x] 先寫：只有一位 complete 時無 pairing
- [x] 實作 similarity

### 2.5 Snapshot
- [x] 先寫：incomplete participant 不進 snapshot 統計
- [x] 先寫：同名 participant 仍依 id 分開
- [x] 先寫：snapshot 重新載入結果不變
- [x] 實作 buildResultSnapshot

## 3. Realtime / persistence
- [x] 建立 session / participant / response / result snapshot 最小 schema
- [x] anonymous join 前端與 open-session RLS 已實作（Auth provider runtime 尚待驗證）
- [x] participant 可在 open 狀態更新 latest response
- [x] host 可在任意合理時點 lock
- [x] locked 後拒絕 response update
- [x] 建立 result snapshot 後切換 revealed
- [x] Realtime 同步 session status 與完成數

## 4. UI slices
- [x] Realtime 觸發手機自動切換人格卡
- [x] locked 階段顯示結算等待畫面
- [x] 主持人倒數 Reveal 畫面可在刷新後續跑
- [x] 加入場次頁
- [x] 題目頁與修改答案
- [x] host 控制頁
- [x] 群體 Reveal 頁
- [x] 個人人格卡
- [x] 靈魂飯友 / 飲食天敵
- [x] 主持人 QR Code 加入連結
- [x] 主持人匿名群體笑點卡（都可以自信值 / 飲食內戰 / 歷史性共識）
- [x] 未完成 participant Reveal 後顯示明確無結果狀態
- [x] 人格卡使用動物角色 emoji
- [x] 主持人結果顯示「我們這團可以出去吃飯嗎？」與 deterministic 飯局相容度
- [x] 手機人格卡同步顯示團體飯局 verdict 與相容度

## 5. Playwright case tests
- [x] CASE-01 多人正常流程 test code 已寫（NOT_RUN）
- [x] CASE-02 未滿約 8 人仍可 Reveal test code 已寫（NOT_RUN）
- [x] CASE-03 Reveal 前反覆修改，採最後答案 test code 已寫（NOT_RUN）
- [x] CASE-04 未完成者不阻塞 test code 已寫（NOT_RUN）
- [x] CASE-05 Lock 後不可修改 test code 已寫（NOT_RUN）
- [x] CASE-06 Refresh 後結果一致 test code 已寫（NOT_RUN）
- [x] CASE-07 公開畫面不洩漏個人逐題答案 test code 已寫（NOT_RUN）
- [x] CASE-08 第 9 位仍可加入 test code 已寫（NOT_RUN）

## 5.1 Database integration verification
- [x] 真實雲端 schema 已套用 Supabase
- [x] response insert 會觸發 participant.completed_at
- [x] participant 只能讀自己的 response
- [x] host 可讀 hosted room 的 responses
- [x] outsider 無法讀 room participants / responses
- [x] locked 後 response update 影響 0 rows
- [x] locked 後新 participant insert 被 RLS 拒絕
- [x] Supabase Security Advisor 無安全警告
- [ ] Anonymous Sign-ins 已在 Dashboard 啟用

## 6. Final validation
- [ ] npm run typecheck
- [ ] npm run test:unit
- [ ] npm run test:e2e
- [ ] npm run build
- [x] final diff review（GitHub compare static review；runtime validation 仍待本機）
- [ ] OpenSpec archive readiness review
