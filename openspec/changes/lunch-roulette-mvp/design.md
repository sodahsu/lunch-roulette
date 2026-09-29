# Design: lunch-roulette-mvp

## 1. Design goals

- 以「多人飯局人格社交遊戲」為產品定位，不做餐廳搜尋器。
- 約 8 人是主要驗證規模，但不使用固定人數 gate。
- 手機優先；主持人可用桌機或大螢幕。
- Reveal 前允許修改；Reveal 後私人 persona result 固定。
- 公開畫面只顯示 aggregate。
- 核心判定 deterministic，可由 unit tests 驗證。
- v0.2 題目變多，但單局仍控制在 12 題。

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
  └─ snapshot + participant results written
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
- 所有 participant 顯示結算等待。
- host 執行或恢復 Reveal。

### `revealed`

- 不接受新 participant 或答案修改。
- host 顯示 group result。
- complete participant 顯示 persisted personal result。
- incomplete participant 顯示未完成狀態。

`sessions.status` 是 Reveal timing 的單一真相來源。

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
- Reveal 前使用 upsert 更新同一筆，不保存舊版本作為有效答案。

### `result_snapshots`

目前只保存：

- `session_id`
- `group_stats`
- `created_at`

它是公開 aggregate 結果的 persisted source。

### `participant_results`

私人結果使用獨立 table 保存：

- `session_id`
- `participant_id`
- `user_id`
- `result`
- `created_at`

`result` 目前包含 persona、soulmates、opposites。

不要把 `participant_results` 描述成 `result_snapshots` 的欄位；兩者是不同 persistence boundary。

## 5. Questionnaire versioning and selection

### v0.1 compatibility

目前資料庫仍存在舊 v0.1 session，因此 client 必須保留原 8 題行為。

v0.1 question ids：

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
- identity 類固定包含 `self-image`，另一題由 seed 決定。
- 12 題再用同一 session code 產生 deterministic order。
- 不另外把 selected question ids 寫進 DB。

理由：`session.code + questionnaire_version` 已足以重建 active questionnaire，避免多一份 selection source of truth。

## 6. Domain ownership

核心規則集中在 pure TypeScript domain functions：

- `isCompleteResponse()`
- `calculateGroupStats()`
- `calculateGroupCompatibility()`
- `calculatePersonaScores()`
- `assignPersona()`
- `calculateSimilarity()`
- `buildParticipantResult()`
- `buildResultSnapshot()`

Supabase adapter 負責 persistence / Realtime；UI 不應自行實作另一套 scoring rule。

## 7. Reveal transaction sequence

1. Host 觸發 Reveal。
2. Session 由 `open` 更新成 `locked`。
3. RLS / status rule 阻止後續 response update 與 late join。
4. Host 讀取 locked session 的 latest responses。
5. 只取 `is_complete = true` responses 建立 snapshot。
6. 寫入 `result_snapshots.group_stats`。
7. 為 complete participants 寫入 `participant_results`。
8. Session 由 `locked` 更新成 `revealed`。
9. Realtime 讓所有 clients 切換到結果狀態。

Group snapshot 與 participant results 使用 insert-only / ignore-duplicate recovery，讓 locked host refresh 後可以安全續跑，不必放寬 private result RLS。

## 8. Group dining compatibility

飯局相容度只使用 persisted `group_stats`。

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
| 80–100 | 我們這團可以直接出去吃飯 |
| 68–79 | 我們這團可以出去吃飯 |
| 56–67 | 可以出去吃，但不要開放全民表決 |
| 0–55 | 可以出去吃，但最好先指定隊長 |

少於 2 位 complete participants 時：

- score 顯示為不可視為正式判定的 0。
- verdict 使用「先不要急著訂位」。
- detail 明確說明有效樣本不足。

### Persistence note

目前 `group_stats` 會 persist，但 group compatibility 的 score / verdict 是 client 依 v0.2 formula 從 group stats 重新 derive，**沒有另外存進 snapshot**。

這代表：
- 同一版程式 reload 是 deterministic。
- 若未來修改 compatibility formula，舊 revealed session 的文字／分數理論上可能跟著變。

若產品要求「跨未來版本也永久不變」，archive 前需要二選一：
1. persist compatibility summary；或
2. 依 `questionnaire_version` 永久保留舊版 compatibility algorithm。

目前尚未有使用者對這個跨版本要求的明確決策，因此保持 active change，不把它寫成已解決。

## 9. Persona behavior

- 共 8 種 persona。
- 只使用 active questions 的 option scores。
- 各 persona score 加總後取最高。
- 不使用 threshold。
- 同分使用固定 `PERSONA_PRIORITY`。
- complete participant 的 persona result 會 persist 到 `participant_results`。
- Reveal UX 可以像抽卡，但結果本身不是隨機抽取。

## 10. Matching behavior

- 只比較 complete participants。
- 只比較 active questions。
- similarity = 答案完全相同題數 / 雙方可比較題數。
- 不與自己比較。
- soulmate = highest similarity。
- opposite = lowest similarity。
- highest / lowest 並列時全部保留。
- 只有一位 complete participant 時不產生 pairing。

## 11. Privacy boundary

Public / host：

- 可看 participant display names。
- 可看加入數、完成數。
- 可看 group aggregate。
- 不可看 participant per-question answers。

Participant：

- 可讀自己的 response。
- Reveal 後可讀自己的 persisted participant result。
- pairing 結果可顯示其他 participant 的 display name，但不公開其逐題答案。

## 12. Testing strategy

### Unit / Vitest

已寫入的 test code 覆蓋：

- 24 題、6 類、每類 4 題。
- v0.2 每房 12 題、每類 2 題。
- `self-image` 必出。
- 相同房號重建相同題組。
- v0.1 保留原 8 題。
- active questionnaire completeness。
- complete-only group stats。
- 3 / 8 / 9 participants。
- group dining compatibility。
- persona deterministic / highest score / tie-break。
- similarity / soulmate / opposite / ties / self exclusion。
- incomplete exclusion。
- snapshot deterministic rebuild。

**Runtime status：NOT_RUN。**

### Playwright

`tests/e2e/lunch-roulette.spec.ts` 已寫 CASE-01～08：

1. 多人正常流程與同步 persona。
2. 未滿 8 人仍可 Reveal。
3. 修改後採 latest response。
4. 未完成者不阻塞。
5. Lock 後不可改。
6. Reveal 後 refresh 結果一致。
7. Host 公開結果不洩漏個人答案。
8. 第 9 位可加入。

並包含 group dining verdict 的 reveal assertion。

**Runtime status：NOT_RUN。**

## 13. Validation gate

在此 change 可 archive 前至少需要：

1. `npm install`
2. `npm run test:unit`
3. `npm run typecheck`
4. `npm run build`
5. `npm run test:e2e`
6. Anonymous Sign-ins runtime verification
7. 實際多人 Reveal smoke test
8. Review compatibility cross-version persistence decision
