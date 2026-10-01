# Tasks: lunch-roulette-mvp

## 0. Contract / product decisions

- [x] 定義產品定位：多人飯局人格社交遊戲，不是餐廳推薦器
- [x] 約 8 人是主要規模，不是 hard limit
- [x] Reveal 不要求所有已加入者完成
- [x] Reveal 前允許修改 latest response
- [x] v0.2 建立 24 題題庫
- [x] v0.2 分 6 類，每類 4 題
- [x] v0.2 每房 deterministic 選 12 題，每類 2 題
- [x] `self-image` 每局必出
- [x] v0.1 legacy session 保留原 8 題
- [x] Persona 固定 10 種、最高分制、固定 `PERSONA_PRIORITY` tie-break
- [x] Persona v0.2 不使用 threshold
- [x] Similarity 使用 active questions 的答案完全一致率
- [x] 團體指標正式命名「我們這團今晚約成飯的成功率」
- [x] 成功率定義為 deterministic game score，不冒充真實機率模型
- [x] Reveal 採兩段式：先大螢幕成功率，再手機 persona 翻牌
- [x] v0.2 核心判定不使用生成式 AI

## 1. Session / persistence implementation

- [x] Vue 3 + Vite + TypeScript scaffold
- [x] Supabase client
- [x] session / participant / response / result snapshot schema
- [x] Anonymous Auth client flow
- [x] open / locked / revealed state model
- [x] open session join
- [x] locked/revealed late join RLS restriction
- [x] participant latest response upsert
- [x] locked 後 response update restriction
- [x] Realtime session / participant / response / result subscription
- [x] locked host refresh / continue Reveal recovery path
- [x] locked group-stats preview，不提前 persist persona
- [x] host 翻人格卡後 persist group snapshot
- [x] host 翻人格卡後 persist participant-specific results
- [x] final persona reveal 才切 session 到 `revealed`

## 2. Question bank / domain implementation

- [x] 24 題 question bank
- [x] 6 question categories
- [x] deterministic 12-question room selection
- [x] v0.1 legacy 8-question selection
- [x] completeness 使用 active questionnaire
- [x] group stats 使用 active questionnaire
- [x] persona scoring 使用 active questionnaire
- [x] similarity / pairing 使用 active questionnaire
- [x] `calculateDinnerSuccessRate()`
- [x] Dinner Success algorithm 依 `questionnaire_version` versioned mapping
- [x] v0.1 / v0.2 固定使用 `v1` algorithm
- [x] 未 mapping 的新 questionnaire version 明確 fail，不 silent fallback
- [x] Unit test code：question bank / completeness / stats / success rate / persona / pairing / snapshot

## 3. UI implementation

- [x] 房號加入
- [x] QR Code 加入連結
- [x] 暱稱加入
- [x] 12 題進度與答題
- [x] Reveal 前修改答案
- [x] Waiting 畫面
- [x] Host 加入／完成數
- [x] Host participant name list
- [x] Lock + Reveal countdown
- [x] locked participant 結算等待
- [x] 大螢幕先顯示「今晚約成飯的成功率」
- [x] 樣本不足時不顯示誤導性的 0%
- [x] 成功率畫面提供「翻出所有人格卡」動作
- [x] Host 未翻牌前 participant 不出現 persona
- [x] Host 翻牌後 participant Realtime 自動出現 persona
- [x] incomplete participant 明確無 persona 狀態
- [x] 動物 persona card
- [x] soulmate / opposite
- [x] Host 都可以自信值
- [x] Host 飲食內戰
- [x] Host 歷史性共識
- [x] Persona 手機卡聚焦個人人格與配對，不重複團體成功率
- [x] 第 4 / 8 / 11 題加入固定節奏事件
- [x] Participant waiting 依剩餘人數顯示防冷場文案
- [x] Host lobby 依加入／完成人數顯示防冷場文案
- [x] 成功率改成三拍揭曉：自我認知 → 實際成功率鋪陳 → 分數與 verdict
- [x] Persona 翻牌後 Host 顯示「舉手機找飯友／天敵」社交收尾
- [x] Dark Editorial global design tokens
- [x] Landing 巨型「都可以？」typography
- [x] Host Control Room / READY / THINKING roster
- [x] Quiz A / B 大型矩形選項
- [x] 第 4 / 8 / 11 題 full-screen interstitial
- [x] Success Rate 大型 typography reveal
- [x] 「公開處刑 🎴」final reveal CTA
- [x] 10 種 Persona runtime asset 與 inline SVG fallback system
- [x] Collectible Persona Card：TYPE / subtype / MATCH / ENEMY
- [x] Mobile responsive visual system
- [x] focus-visible / prefers-reduced-motion
- [x] Dark document theme metadata
- [x] 音效系統：Host lobby loop、答題 click、lock、3/2/1、suspense、result reveal / victory
- [x] 全域音效開關並以 localStorage 記住靜音設定
- [x] Audio 由使用者互動解鎖，避免 mobile autoplay 失敗
- [x] Lobby loop 只在 landing / Host 使用，進入答題與 Reveal 會停止，避免多裝置長時間疊音

## 4. Automated test code

- [x] Vitest package / script / test file 已設定
- [x] Playwright package / config 已設定
- [x] CASE-01 驗證「成功率先出 → 手機仍 waiting → host 翻牌 → 手機 persona」
- [x] CASE-02 未滿 8 人 Reveal test code
- [x] CASE-03 latest response test code
- [x] CASE-04 incomplete 不阻塞 test code
- [x] CASE-05 lock 後不可改 test code
- [x] CASE-06 refresh 結果一致 test code
- [x] CASE-07 public privacy test code
- [x] CASE-08 第 9 位可加入 test code
- [x] CASE-09 第 4 題節奏事件 test code
- [x] CASE-10 Persona collectible card regression test code
- [x] CASE-11 房號不存在與 URL 清理 test code
- [x] CASE-12 結束後重新開局 test code
- [x] CASE-13 示意 Persona 結果 test code
- [x] CASE-14 一般卡與稀有卡顯示 test code
- [x] CASE-15 每場稀有卡保底與原因 test code
- [x] CASE-16 food consensus 示意流程 test code
- [x] CASE-17 十人結果總覽與 responsive layout test code
- [x] CASE-18 音效控制可切換並記住靜音設定

> 上述只代表 test code 已寫，不代表 runtime PASS。

## 5. 已有 database verification evidence

- [x] Live Supabase schema 已套用
- [x] response insert 會同步 participant completion
- [x] participant 只能讀自己的 response
- [x] host 可讀 hosted room responses
- [x] outsider 無法讀 room participants / responses
- [x] locked 後 response update 被拒
- [x] locked 後新 participant insert 被 RLS 拒絕
- [x] Host-only revealed participant overview RLS policy 已於 production 查核存在（2026-10-01）
- [x] Supabase Security Advisor 已重新查核；目前有 Anonymous Sign-ins 相關 warning 與 leaked-password-protection warning，無此次 overview RLS 缺失

## 6. Runtime validation — pending

- [x] 確認 Supabase Anonymous Sign-ins provider 已 Enable（2026-09-30 於 Dashboard 開啟；註冊 API 回傳 token）
- [x] 依賴安裝成功並產生 lockfile（專案已遷移至 pnpm，lockfile 為 `pnpm-lock.yaml`）
- [x] `pnpm test:unit`（33 項通過；2026-09-30）
- [x] `pnpm typecheck`（2026-09-30）
- [x] `pnpm build`（2026-09-30）
- [x] `pnpm test:e2e`（16 項通過；2026-09-30，屬較早 HEAD）
- [x] `pnpm test:e2e`（18 項通過，含 CASE-17 / CASE-18；2026-10-01，`bab2aa5`；首次冷啟動曾有 1 次逾時，重跑全過）
- [ ] 實際驗證 v0.2 同房所有 clients 都拿到同一 12 題與順序
- [ ] 實際驗證 v0.1 舊 session 仍維持 8 題
- [x] 實際驗證成功率畫面出現時 participant 仍停留在 waiting（e2e CASE-01）
- [x] 實際驗證 host 按翻人格卡後所有完成者同步 persona（e2e CASE-01）
- [x] 實際驗證 incomplete participant 不會拿到 persona（e2e CASE-04）
- [ ] 實際驗證第 4 / 8 / 11 題節奏提示不影響答題（e2e CASE-09 只涵蓋第 4 題）
- [ ] 實際驗證成功率三拍揭曉沒有多餘停頓
- [ ] 實際驗證人格翻牌後大螢幕收尾提示可見
- [ ] 實際驗證 Dark Visual 在 375 / 768 / 大螢幕不裁切（360 / 375 / 390 / 768 已自動檢查無橫向溢出、觸控目標 ≥44px；大螢幕與實機未驗）
- [ ] 實際驗證 Persona SVG 在手機小尺寸清楚可辨識（人格卡已改用插圖，需實機確認）
- [ ] 實際驗證 reduced-motion
- [ ] 實際多 browser / device Reveal smoke test
- [ ] 實機驗證 iOS / Android 首次互動後音訊成功解鎖
- [ ] 實機驗證多人現場只有 Host 持續播放 lobby BGM，participant 僅短音效

## 6b. Food consensus（大家都能吃）

- [x] domain：`src/domain/foods.ts`、`buildResultSnapshot` 附加 `food-avoid` stat
- [x] 單元測試涵蓋編碼、共識、無安全牌、未回答略過、snapshot 附加
- [x] 忌口步驟與結果頁區塊（host / participant）
- [x] 示意頁 e2e（CASE-16）
- [ ] 實際驗證多人流程：忌口步驟、揭曉後清單一致（需 Supabase，e2e CASE-01～12、15 已改 helper 但未跑）
- [ ] 實際驗證最後一題交卷後、忌口未填時被揭曉的行為（該人被略過，不算未完成）

## 7. Archive gate

- [x] OpenSpec proposal / design / capability specs 已同步兩段式 Reveal、food consensus、稀有卡、Host overview 與音效可觀察行為
- [x] 已修正 `result_snapshots` 與 `participant_results` ownership 描述
- [x] 成功率跨未來程式版本採 `questionnaire_version → algorithm version` 固定 mapping
- [x] 不新增 success-summary persistence；舊版 algorithm 由 code 保留
- [ ] 完成 runtime validation
- [ ] OpenSpec archive readiness review

**Current archive verdict: NOT_READY**

原因：contract drift 已於 2026-10-01 收斂；目前剩最新 HEAD 的 runtime / integration validation、真機多人驗證與 archive readiness review。
