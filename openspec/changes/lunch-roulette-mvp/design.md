# Design: lunch-roulette-mvp

## 1. Design goals

- 以「多人飯局人格社交遊戲」為產品定位，不做餐廳搜尋器。
- 約 8 人是主要驗證規模，但不使用固定人數 gate。
- 手機優先；主持人可用桌機或大螢幕。
- Reveal 前允許修改；Reveal 後私人 persona result 固定。
- 公開畫面只顯示 aggregate，不顯示個人逐題答案。
- 核心判定 deterministic，可由 unit tests 驗證。
- v0.2 題庫 24 題，但單局固定 12 題。
- Reveal 必須有「團體 → 個人」兩段高潮：
  1. 大螢幕先公布今晚約成飯的成功率。
  2. 主持人再觸發手機同步翻人格卡。

## 2. Technical baseline

### Frontend

- Vue 3
- Vite
- TypeScript
- 單一 SPA，以 session query parameter 與目前使用者角色決定畫面。

### Backend / realtime

- Supabase Anonymous Auth
- Supabase Postgres
- Supabase Realtime
- 不新增獨立 Node backend。

## 3. Session state model

```text
open
  └─ host starts reveal
      ↓
locked
  ├─ countdown
  ├─ host shows dinner success rate
  └─ host presses "翻出所有人格卡"
      ↓
revealed
```

### `open`

- 新 participant 可加入。
- participant 可答題、修改與重新整理恢復。
- host 可看到加入／完成人數。
- 至少一位 participant 完成後 host 可以 Reveal。

### `locked`

- 不接受新 participant。
- 不接受 response update。
- participant 手機持續顯示等待畫面。
- host 可以：
  - 執行／恢復倒數。
  - 從 locked responses 計算 aggregate preview。
  - 顯示「我們這團今晚約成飯的成功率」。
- 成功率畫面顯示期間 session **仍然是 `locked`**。
- 任何 persona result 在此階段都不得顯示。

### `revealed`

- host 已明確觸發人格翻牌。
- group snapshot 與 participant results 已建立。
- complete participant 自動顯示 persisted persona card。
- incomplete participant 顯示未完成狀態。

`sessions.status` 仍是跨裝置 Reveal timing 與資料可修改性的單一真相來源。

「倒數」與「成功率已顯示」只是 host UI 的局部 subphase，不新增 DB status。

## 4. Data ownership

### `sessions`

- `id`
- `code`
- `host_user_id`
- `status`
- `questionnaire_version`
- timestamps

新建立 session 明確寫入 `questionnaire_version = 'v0.2'`。

### `participants`

- participant identity
- session ownership
- anonymous auth user id
- display name
- completion / activity timestamps

`participant.id` 是 pairing identity；display name 只用於顯示，因此同名不得合併。

### `responses`

每個 `session_id + participant_id` 只有一筆 latest response。

- `answers` 保存 active question answers。
- `is_complete` 由 active questionnaire 判定。
- Reveal 前使用 upsert 更新同一筆。

### `result_snapshots`

保存：

- `session_id`
- `group_stats`
- `created_at`

正式 snapshot 只在 host 觸發 persona 翻牌時建立。

locked 成功率畫面使用的是 **in-memory preview**，不是另一份 persisted source of truth。

### `participant_results`

私人結果使用獨立 table：

- `session_id`
- `participant_id`
- `user_id`
- `result`
- `created_at`

`result` 包含 persona、soulmates、opposites。

## 5. Questionnaire versioning and selection

### v0.1 compatibility

舊 v0.1 session 保留原 8 題：

- `group-choice`
- `queue`
- `new-place`
- `budget`
- `distance`
- `you-decide`
- `last-bite`
- `self-image`

### v0.2 bank

題庫共有 24 題、6 類：

- `alignment`
- `effort`
- `value`
- `adventure`
- `social`
- `identity`

每類 4 題。

### v0.2 room selection

- 以 `session.code + category + question.id` 產生 deterministic ordering。
- 每類選前 2 題。
- identity 類固定包含 `self-image`。
- 12 題再用同一 session code 排出 deterministic order。
- 不另外 persist selected question ids。

## 6. Domain ownership

核心規則集中在 pure TypeScript domain functions：

- `isCompleteResponse()`
- `calculateGroupStats()`
- `calculateDinnerSuccessRate()`
- `calculatePersonaScores()`
- `assignPersona()`
- `calculateSimilarity()`
- `buildParticipantResult()`
- `buildResultSnapshot()`

Supabase adapter 負責 persistence / Realtime；UI 不應自行實作另一套 scoring rule。

## 7. Two-stage Reveal sequence

### Stage A｜團體成功率

1. Host 按「鎖定並揭曉」。
2. Session 由 `open` → `locked`。
3. RLS / status rule 阻止 response update 與 late join。
4. Participant 手機全部進入等待畫面。
5. Host 執行 3 / 2 / 1 倒數。
6. Host 讀取 locked session 的 latest responses。
7. 只用 complete responses 計算 group stats preview。
8. 大螢幕顯示「我們這團今晚約成飯的成功率」。
9. Session 仍維持 `locked`。
10. Persona 尚未 persist，也尚未顯示。

### Stage B｜個人人格翻牌

1. Host 按「翻出所有人格卡」。
2. 再次從 locked responses 建立正式 deterministic snapshot。
3. Persist `result_snapshots.group_stats`。
4. 為 complete participants persist `participant_results`。
5. Session 由 `locked` → `revealed`。
6. Realtime 讓所有 participant clients 收到 revealed。
7. 每支完成答題的手機自動切換成 persona card。
8. Participant 不需要額外按鈕或 reload。

這個順序確保大螢幕先講「我們這群人」，手機再回答「你這個人」。

## 8. Dinner success rate

UI 名稱：

**「我們這團今晚約成飯的成功率」**

這是遊戲內的 deterministic score，不是統計校準過的真實事件機率或預測模型。

### Formula

對每一個 `sampleSize > 1` 的 group question：

```text
questionAgreement = max(optionCounts) / sampleSize
```

整體：

```text
score = round(mean(questionAgreement) * 100)
```

### v0.2 verdict bands

| Score | Verdict |
|---:|---|
| 80–100 | 今晚直接出門，不要再討論 |
| 68–79 | 今晚約得成，找一個人負責訂位 |
| 56–67 | 約得成，但不要再開全民表決 |
| 0–55 | 有機會約成，先指定飯局隊長 |

少於 2 位 complete participants 時：

- UI 顯示「樣本不足」，不是 `0%`。
- verdict 使用「先不要急著訂位」。
- 不把 score 0 解讀成低成功率。

### Persistence note

- locked 成功率 preview：從 locked responses 即時計算，不 persist。
- final `group_stats`：host 翻 persona 時 persist。
- revealed 後如需重新顯示成功率，從 persisted `group_stats` deterministic derive。

如果未來修改成功率公式，舊 revealed session 的 derived score 理論上可能跟著變。

若產品要求「跨未來程式版本永久不變」，archive 前需要二選一：
1. persist success summary；或
2. 依 `questionnaire_version` 保留舊版 success-rate algorithm。

## 9. Persona behavior

- 共 8 種 persona。
- 只使用 active questions 的 option scores。
- 各 persona score 加總後取最高。
- 不使用 threshold。
- 同分使用固定 `PERSONA_PRIORITY`。
- Persona 只在 final persona reveal 時 persist。
- Reveal UX 可以像抽卡，但結果不是隨機抽取。

## 10. Matching behavior

- 只比較 complete participants。
- 只比較 active questions。
- similarity = 答案完全相同題數 / 雙方可比較題數。
- 不與自己比較。
- soulmate = highest similarity。
- opposite = lowest similarity。
- 並列全部保留。
- 只有一位 complete participant 時不產生 pairing。

## 11. Privacy boundary

Host：

- 可看 participant display names。
- 可看加入數、完成數。
- 可看 aggregate 與 success rate。
- 不可看 participant per-question answers。

Participant：

- open 時可讀自己的 response。
- locked 時只能看到等待狀態。
- revealed 後可讀自己的 persisted participant result。
- Persona card 聚焦 persona、靈魂飯友、飲食天敵。

## 12. Testing strategy

### Unit / Vitest

Test code 覆蓋：

- 24 題、6 類、每類 4 題。
- v0.2 每房 12 題、每類 2 題。
- `self-image` 必出。
- v0.1 legacy 8 題。
- active questionnaire completeness。
- complete-only group stats。
- 3 / 8 / 9 participants。
- dinner success rate。
- persona deterministic / highest score / tie-break。
- similarity / soulmate / opposite / ties / self exclusion。
- incomplete exclusion。
- snapshot deterministic rebuild。

**Runtime status：NOT_RUN。**

### Playwright

CASE-01 已改為驗證核心 Reveal 順序：

```text
Host lock
→ 大螢幕成功率
→ Participant 仍 waiting
→ Host 翻人格卡
→ Participant 手機同步 persona
```

其餘 CASE-02～08 繼續驗證：

- 未滿 8 人 Reveal。
- latest response。
- incomplete 不阻塞。
- lock 後不可改。
- refresh 結果一致。
- public privacy。
- 第 9 位可加入。

**Runtime status：NOT_RUN。**

## 13. Validation gate

在此 change 可 archive 前至少需要：

1. `npm install`
2. `npm run test:unit`
3. `npm run typecheck`
4. `npm run build`
5. `npm run test:e2e`
6. Anonymous Sign-ins runtime verification
7. 實際多人兩段式 Reveal smoke test
8. Review success-rate cross-version persistence decision
