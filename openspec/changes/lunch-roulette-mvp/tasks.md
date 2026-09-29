# Tasks: lunch-roulette-mvp

## 0. Spec gate
- [x] 定義半天 MVP 範圍與非目標
- [x] 定義技術基線與資料 ownership
- [x] 定義 unit test 與 case test 策略
- [ ] 確認正式題數與題目內容
- [ ] 確認 persona 名稱、score 規則與 tie-break
- [ ] 確認 similarity 第一版計算方式

## 1. Project scaffold
- [x] 建立 Vue 3 + Vite + TypeScript
- [ ] 安裝並設定 Vitest
- [ ] 安裝並設定 Playwright
- [x] 設定 Supabase client 與環境變數
- [x] 建立 typecheck / test:unit / test:e2e / build scripts

## 2. Domain tests first
### 2.1 Response completeness
- [x] 先寫：完整 required answers => complete
- [x] 先寫：少一題 => incomplete
- [ ] 先寫：同一 participant 修改後採 latest response
- [x] 實作最小 completeness logic

### 2.2 Group stats
- [ ] 先寫：只計入 complete responses
- [x] 先寫：3 / 8 / 9 人皆可計算
- [x] 先寫：0 complete 不產生 NaN / Infinity
- [x] 實作最小 group stats logic

### 2.3 Persona
- [x] 先寫：相同輸入得到相同 persona
- [ ] 先寫：threshold 邊界
- [ ] 先寫：score 平手使用固定 tie-break
- [x] 實作 persona scoring / assignment

### 2.4 Similarity
- [x] 先寫：不與自己比較
- [ ] 先寫：最高 similarity
- [ ] 先寫：最低 similarity
- [ ] 先寫：並列保留全部
- [ ] 先寫：只有一位 complete 時無 pairing
- [x] 實作 similarity

### 2.5 Snapshot
- [x] 先寫：incomplete participant 不進 snapshot 統計
- [ ] 先寫：同名 participant 仍依 id 分開
- [ ] 先寫：snapshot 重新載入結果不變
- [x] 實作 buildResultSnapshot

## 3. Realtime / persistence
- [x] 建立 session / participant / response / result snapshot 最小 schema
- [ ] participant 可以匿名加入 open session
- [x] participant 可在 open 狀態更新 latest response
- [x] host 可在任意合理時點 lock
- [x] locked 後拒絕 response update
- [x] 建立 result snapshot 後切換 revealed
- [x] Realtime 同步 session status 與完成數

## 4. UI slices
- [x] 加入場次頁
- [x] 題目頁與修改答案
- [x] host 控制頁
- [ ] 群體 Reveal 頁
- [x] 個人人格卡
- [x] 靈魂飯友 / 飲食天敵

## 5. Playwright case tests
- [ ] CASE-01 多人正常流程
- [ ] CASE-02 未滿約 8 人仍可 Reveal
- [ ] CASE-03 Reveal 前反覆修改，採最後答案
- [ ] CASE-04 未完成者不阻塞
- [ ] CASE-05 Lock 後不可修改
- [ ] CASE-06 Refresh 後結果一致
- [ ] CASE-07 公開畫面不洩漏個人逐題答案
- [ ] CASE-08 第 9 位仍可加入

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
- [ ] final diff review
- [ ] OpenSpec archive readiness review
