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
- [x] Persona 固定 8 種、最高分制、固定 `PERSONA_PRIORITY` tie-break
- [x] Persona v0.2 不使用 threshold
- [x] Similarity 使用 active questions 的答案完全一致率
- [x] Reveal 加入「我們這團可以出去吃飯嗎？」與 deterministic 飯局相容度
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
- [x] group stats persistence
- [x] participant-specific result persistence
- [x] locked host refresh / continue Reveal recovery path

## 2. Question bank / domain implementation

- [x] 24 題 question bank
- [x] 6 question categories
- [x] deterministic 12-question room selection
- [x] v0.1 legacy 8-question selection
- [x] completeness 使用 active questionnaire
- [x] group stats 使用 active questionnaire
- [x] persona scoring 使用 active questionnaire
- [x] similarity / pairing 使用 active questionnaire
- [x] deterministic group dining compatibility
- [x] Unit test code：question bank / completeness / stats / compatibility / persona / pairing / snapshot

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
- [x] revealed participant 自動翻 persona
- [x] incomplete participant 明確無 persona 狀態
- [x] 動物 persona card
- [x] soulmate / opposite
- [x] Host 飯局相容度
- [x] Host 都可以自信值
- [x] Host 飲食內戰
- [x] Host 歷史性共識
- [x] Participant persona card 顯示團體飯局 verdict

## 4. Automated test code

- [x] Vitest package / script / test file 已設定
- [x] Playwright package / config 已設定
- [x] CASE-01 多人正常流程 test code
- [x] CASE-02 未滿 8 人 Reveal test code
- [x] CASE-03 latest response test code
- [x] CASE-04 incomplete 不阻塞 test code
- [x] CASE-05 lock 後不可改 test code
- [x] CASE-06 refresh 結果一致 test code
- [x] CASE-07 public privacy test code
- [x] CASE-08 第 9 位可加入 test code

> 上述只代表 test code 已寫，不代表 runtime PASS。

## 5. 已有 database verification evidence

- [x] Live Supabase schema 已套用
- [x] response insert 會同步 participant completion
- [x] participant 只能讀自己的 response
- [x] host 可讀 hosted room responses
- [x] outsider 無法讀 room participants / responses
- [x] locked 後 response update 被拒
- [x] locked 後新 participant insert 被 RLS 拒絕
- [x] Supabase Security Advisor 前次查核無 security lint

## 6. Runtime validation — pending

- [ ] 確認 Supabase Anonymous Sign-ins provider 已 Enable
- [ ] `npm install` 成功並產生 lockfile
- [ ] `npm run test:unit`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] 實際驗證 v0.2 同房所有 clients 都拿到同一 12 題與順序
- [ ] 實際驗證 v0.1 舊 session 仍維持 8 題
- [ ] 實際多 browser / device Reveal smoke test
- [ ] 實際驗證 host / participant 的 group dining verdict 一致

## 7. Archive gate

- [x] OpenSpec proposal / design / capability specs 已同步 v0.2 current implementation
- [x] 已修正 `result_snapshots` 與 `participant_results` ownership 描述
- [ ] 決定「飯局相容度」是否必須跨未來程式版本永久不變
- [ ] 若要求跨版本不變，persist compatibility summary 或保留 versioned compatibility algorithm
- [ ] 完成 runtime validation
- [ ] OpenSpec archive readiness review

**Current archive verdict: NOT_READY**

原因：runtime validation 尚未執行，且 group compatibility 的跨版本 persistence contract 尚未決定。
