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
- 避免現場 dead air：加入等待吐槽、答題節奏事件、成功率分拍揭曉與人格翻牌後的社交收尾。
- 防冷場內容只能使用公開計數或固定文案，不得偷讀／暴露個人逐題答案。

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

`result` 包含 persona、rare、rareReason、soulmates、opposites；rare 欄位屬 Reveal 結果的一部分，但判定與作答內容無關。

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

1. Host 按「公開處刑 🎴」。
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

### Persistence / versioning

- locked 成功率 preview：從 locked responses 即時計算，不 persist。
- final `group_stats`：host 公開 Persona 時 persist。
- revealed 後重新顯示成功率，從 persisted `group_stats` deterministic derive。
- Dinner-success algorithm 由 `questionnaire_version` 明確選擇。
- `v0.1` 與 `v0.2` 目前都綁定 `v1` success algorithm。
- 新 questionnaire version 若沒有明確 algorithm mapping，domain function 應直接拒絕，不得 fallback 到最新演算法。

因此舊 room 的 algorithm contract 不會因未來新增公式而默默改變；不需要新增 success-summary DB 欄位。

## 9. Persona behavior

- 共 10 種 persona。
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

## 12. Game pacing

### Quiz pacing

v0.2 的 12 題不應維持完全相同節奏到底。

固定在：
- 第 4 題：場面觀察。
- 第 8 題：中場警報。
- 第 11 題：最後兩題提示。

這些都是 UI cue：
- 不改變選項。
- 不改變答案。
- 不參與 scoring。
- 不引用任何 participant 的真實個人答案。

### Waiting pacing

Participant 已交卷但 session 仍 open 時，以 `participants.length`、`completedCount`、derived incomplete count 顯示趣味等待文案。

Host lobby 同樣只使用加入／完成數，避免透露某人的選擇。

### Success reveal pacing

成功率不能在倒數結束後瞬間只丟一個百分比。

Host UI 依序顯示：
1. 「幾個人自認超好約」。
2. 「但答案比你們誠實，實際成功率是……」。
3. 最終成功率、verdict 與「公開處刑」按鈕。

這三拍都仍屬 `locked`，participant 手機持續 waiting。

### Social ending

Final persona reveal 完成後，Host 顯示最後任務：
- 全部把手機舉起來。
- 找自己的靈魂飯友。
- 找自己的飲食天敵。

這個階段不新增新的 domain 計算，也不公開逐題答案。

## 13. Visual system

目前實作採 **Dark Editorial × Food Personality × Social Experiment**。

### Global tokens

- Background：`#0B0B0C`
- Surface：深灰黑階
- Primary text：off-white
- Shared accent：Electric Blue
- Success / live accent：Acid Lime
- Reveal danger accent：Alert Red
- 不使用外部 web font；使用 system sans 與 system monospace fallback，避免現場網路造成字型失效。

### Landing

- 巨型「都可以？」typography 是主視覺。
- 首頁不再使用大型食物 emoji 當 hero。
- Primary CTA 是「加入飯局」；Host Mode 降低視覺層級。
- 畫面定位為 social experiment poster，不做一般 SaaS hero。

### Host control room

- 房號與 QR 是主要資訊。
- Participant roster 顯示序號、暱稱與 `READY / THINKING`。
- 遠距離大螢幕優先使用高對比與大型數字。

### Quiz

- 一題一屏。
- A / B 選項使用大型矩形與 selected invert。
- 第 4 / 8 / 11 題使用 1.8 秒 full-screen interstitial：
  - `MINORITY DETECTED`
  - `CONSENSUS IS COLLAPSING`
  - `FINAL TWO`
- Interstitial 只使用固定文案，不讀取個人答案，不影響 scoring。

### Dinner success reveal

- 3 / 2 / 1 與成功率使用超大型 monospace typography。
- 三拍 Reveal 每次只顯示一個主要訊息。
- 「公開處刑 🎴」使用 Alert Red 作為 final persona reveal CTA。

### Persona collectible card

Runtime 支援 10 種一致視覺系統的 Persona asset：優先載入 `src/assets/personas/*.webp`，缺圖時由 `src/components/PersonaGlyph.vue` 提供 inline SVG fallback：

- Peacekeeper
- Contrarian
- Picky Eater
- Adventurer
- Value Hunter
- Homebody
- Food Fanatic
- Truly Easygoing
- All-in Eater
- Order Captain

Persona 結果卡顯示：

- TYPE 編號
- English subtype
- 中文人格名稱與 tagline
- MATCH / 靈魂飯友
- ENEMY / 飲食天敵

目前正式 runtime asset 優先使用 repository 內的 `src/assets/personas/*.webp`；缺圖時才退回自有 inline SVG，兩者都不依賴外部 CDN。HANDOFF 的生圖 Prompt Library 已同步為相同 10 Persona identity，作為後續資產重生成來源。

### Responsive / accessibility

- Mobile-first。
- Host 在寬螢幕擴展至 control-room layout。
- 保留 `:focus-visible`。
- 支援 `prefers-reduced-motion`。
- 關鍵 E2E / accessibility label 保持可見或使用 aria label。

## 14. Audio experience

音訊是 pacing 層，不是新的 domain rule，也不改變 session state / scoring。

- Host / landing 可播放低存在感 lobby loop；participant 不播放持續背景音樂。
- Participant 只在自己的操作節點播放短 cue，例如 answer click 與 persona reveal。
- Reveal cue 對齊既有狀態：lock → 3/2/1 → suspense → success result → persona reveal。
- 首次 AudioContext 建立／resume 由使用者 gesture 解鎖，符合 mobile autoplay 限制。
- 全域音效開關以 localStorage 保存；靜音時不得留下持續 loop。
- 音訊 owner 為 `src/lib/audio.ts`；目前使用 Web Audio 產生 placeholder cue，避免在功能分支加入授權不明音樂檔。
- 未來若替換正式音檔，沿用相同 cue contract，不應把播放邏輯散落到畫面元件。

## 15. Testing strategy

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

**Runtime status：33 項 unit tests 通過（2026-09-30）；typecheck 與 build 亦通過。**

### Playwright

Playwright 目前實際包含 CASE-01～18；CASE-17 為十人結果總覽與 responsive layout，CASE-18 為音效切換與靜音偏好持久化。

CASE-01 驗證核心 Reveal 順序：

```text
Host lock
→ 大螢幕成功率
→ Participant 仍 waiting
→ Host 翻人格卡
→ Participant 手機同步 persona
```

CASE-02～10 覆蓋未滿 8 人、latest response、incomplete、lock 後不可改、refresh、privacy、第 9 位、pacing 與 Persona card；CASE-11～16 另覆蓋失效房號、重新開局、示意 Persona、稀有卡與 food consensus；CASE-17 / 18 覆蓋 Host overview responsive layout 與 audio preference。

**Runtime status：2026-09-30 曾在較早 HEAD 驗證 16 項 E2E 通過；目前最新 HEAD 已包含 CASE-17 / CASE-18，尚未重跑完整 E2E，因此不可宣稱最新 HEAD 已全數通過。多裝置與真機驗證仍待執行。**

## 16. Validation gate

在此 change 可 archive 前至少需要：

1. `pnpm install --frozen-lockfile`
2. `pnpm test:unit`
3. `pnpm typecheck`
4. `pnpm build`
5. `pnpm test:e2e`
6. Anonymous Sign-ins runtime verification
7. 實際多人兩段式 Reveal smoke test
8. Confirm latest-HEAD OpenSpec/code drift review is clean
9. Review archive readiness
