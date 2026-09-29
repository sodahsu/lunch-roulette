# Design: lunch-roulette-mvp

## 1. Design goals

- 半天內完成可玩的 MVP。
- 約 8 人在同一空間用手機參與，主持人可用另一個畫面控制揭曉。
- 不以固定人數或「全員完成」作為流程前置條件。
- Reveal 前允許修改；Reveal 後結果必須固定。
- 核心計算可在離線單元測試中驗證。
- 個人答案不出現在全場公開畫面。

## 2. Proposed technical baseline

### Frontend

- Vue 3
- Vite
- TypeScript
- 單一 SPA，依 route/query 區分：
  - 參與者加入／答題
  - 參與者結果
  - 主持人控制／大螢幕結果

### Backend / realtime

- Supabase
  - Anonymous Auth：每個瀏覽器取得匿名 user id，不要求註冊。
  - Postgres：保存 session、participant、latest response、reveal snapshot。
  - Realtime：同步場次狀態、完成數量與揭曉狀態。

不新增獨立 Node backend。半天 MVP 由前端 + Supabase 承擔。

## 3. State model

### Session state

```text
open
  └─ host locks
      ↓
locked
  └─ result snapshot written
      ↓
revealed
```

- `open`：可加入、可答題、可修改。
- `locked`：停止答案變更，畫面顯示「準備揭曉」。
- `revealed`：顯示固定的結果 snapshot。

不使用「已加入人數 == 8」或「所有人完成」作為 state transition 條件。

## 4. Data ownership

### sessions

- id
- host_user_id
- status: `open | locked | revealed`
- questionnaire_version
- created_at
- locked_at
- revealed_at

Session status 是流程狀態的單一真相來源。

### participants

- id
- session_id
- user_id
- display_name
- created_at
- last_seen_at

`id` 是 identity；display_name 只用於顯示，因此允許同名。

### responses

每個 participant + session 只保留一筆 latest response。

- session_id
- participant_id
- answers
- is_complete
- updated_at

Reveal 前更新同一筆資料，不建立「只能送一次」規則。

### result_snapshots

Reveal 後的固定結果。

- session_id
- group_stats
- participant_results
- created_at

保存 derived snapshot 的理由：人格、配對與群體結果在揭曉後必須跨 refresh 保持一致，不應因後續程式版本或重新計算而改變。

## 5. Domain logic

所有核心規則寫成無 Supabase dependency 的 TypeScript pure functions：

- `isCompleteResponse()`
- `calculateGroupStats()`
- `calculatePersonaScores()`
- `assignPersona()`
- `calculateSimilarity()`
- `buildResultSnapshot()`

Supabase adapter 只負責讀寫與 Realtime；不得把人格計分規則散落在 UI 或 database callback。

## 6. Lock / reveal sequence

1. 主持人在任何合理時點按下「準備揭曉」。
2. session 先切為 `locked`。
3. 鎖定後不接受 response update。
4. 系統取得鎖定當下所有 `is_complete = true` 的 latest responses。
5. 建立一次 result snapshot。
6. 寫入 snapshot 後將 session 切為 `revealed`。
7. 所有 client 透過 Realtime 進入結果畫面。

未完成或暫時離線的 participant 不阻塞 reveal。

若完成者少於可產生某項結果所需的人數，該項結果應省略或顯示不可計算狀態，不得阻塞其他結果。

## 7. Privacy boundary

- 公開群體畫面只顯示 aggregate。
- 不顯示「某人選了 A/B」。
- participant result 可顯示自己的 persona 與配對姓名。
- 配對計算使用 participant id，顯示時才轉成 display_name。

## 8. Personality behavior

「隨機出現人格」定義為 Reveal UX，而不是每次重新整理重新抽一張：

- 卡片可以使用洗牌、翻牌、抽卡動畫。
- 真正 persona 由已確認的 scoring rules 產生。
- 同一個 snapshot 對同一 participant 必須穩定。
- NEEDS_CONFIRMATION: 各 persona 的名稱、score 權重與 threshold。

若 persona scores 平手，必須使用穩定 tie-breaker；第一版可依固定 persona priority 處理，確切優先順序在實作前確認。

## 9. Matching behavior

- similarity 只比較完成答題的 participant。
- 自己不與自己比較。
- 「靈魂飯友」取最高相似度。
- 「飲食天敵」取最低相似度。
- 若多人並列最高或最低，可一起顯示，避免任意挑一人。
- 若可比較的人數不足，省略該配對結果。

## 10. Testing strategy

### Unit tests — Vitest

先建立測試，再寫 domain implementation。

#### Response / completeness

- 所有 required answers 完成時回傳 complete。
- 少一題時為 incomplete。
- 同一 participant 多次修改時，snapshot 使用鎖定當下 latest response。

#### Group stats

- 只計入 complete responses。
- 3、8、9 人都可正確計算，證明「8 人不是硬規則」。
- 0 位 complete 時回傳空結果而不是 NaN / Infinity。
- 百分比總數與有效樣本一致。

#### Persona

- 相同 answers + 相同 rules 永遠得到相同 persona。
- Reveal 後重新載入 snapshot 不改變 persona。
- threshold 邊界有明確案例。
- score 平手依已確認 tie-break rule 穩定處理。

#### Matching

- 不會把自己配給自己。
- 找出最高／最低 similarity。
- 並列時保留所有並列結果。
- 只有一位 complete participant 時不產生 pairing。

#### Snapshot

- incomplete participant 不進入統計、persona、pairing。
- snapshot 產生後內容 immutable。
- display_name 相同的人仍以 participant id 分開計算。

### Case tests — Playwright

#### CASE-01 約 8 人正常流程

多位 participant 加入、完成答題；host 手動 lock；所有完成者看到固定結果。

#### CASE-02 未湊滿 8 人仍可揭曉

只有部分參與者加入／完成時，host 仍可以 lock/reveal；系統不要求固定人數。

#### CASE-03 Reveal 前反覆修改

participant 先回答 A、再改 B；host lock 後結果採 B。

#### CASE-04 未完成者不阻塞

其中一人停在答題中；其他人完成；host reveal 成功，未完成者不進入統計。

#### CASE-05 鎖定後不可再改

host lock 後 participant 嘗試修改，UI 呈現已鎖定且資料不被更新。

#### CASE-06 Refresh 後結果一致

揭曉後 participant refresh，persona、group result、matching 與原 snapshot 一致。

#### CASE-07 公開畫面不洩漏個人答案

host/group result page 不可看到特定 participant 的每題選擇。

#### CASE-08 超過 8 人不是錯誤

第 9 位 participant 可正常加入並作答；是否做更高併發保證不在本 MVP 範圍。

## 11. Validation gate

完成一個功能 slice 前至少通過：

1. `npm run typecheck`
2. `npm run test:unit`
3. 相關 `npm run test:e2e` case
4. `npm run build`

上述 script 名稱可依實際 scaffold 調整，但驗證種類不可省略。
