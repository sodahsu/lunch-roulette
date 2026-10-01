# Design: solo-start

## 1. Design goals

- 第一位玩家建立場次後立即有事可做，不需要等待其他人。
- 同一個 session 從 1 人自然成長到 N 人，不建立另一套 Solo 架構。
- Host 與 participant 可以是同一個 anonymous auth user，但 role / record ownership 必須清楚。
- 新加入者不得重置既有 participant 的答案、完成狀態或 identity。
- open 階段可以提供有趣的 provisional feedback，但正式結果仍只屬於 locked/revealed 流程。
- 不破壞現有兩段式 Reveal 的正式 persistence contract。
- 核心規則 deterministic；preview 與 final 使用同一套 domain functions，避免兩套算法漂移。
- 只有 1 人時不得把團體成功率假裝成有統計意義的百分比。

## 2. State model

不新增新的 `sessions.status`。

```text
open
  ├─ 0 complete
  │   └─ 正常答題 / 等待
  │
  ├─ 1 complete
  │   ├─ 該 participant 可看 provisional persona
  │   ├─ 不產生 pairing
  │   ├─ 不顯示 group success %
  │   └─ QR / 房號仍可加入
  │
  ├─ 2+ complete
  │   ├─ provisional persona（各自私有）
  │   ├─ provisional dinner success preview
  │   ├─ provisional food consensus
  │   └─ 有效樣本改變時重算
  │
  └─ host starts final reveal
      ↓
locked
  ├─ freeze responses
  ├─ 正式 dinner success Stage A
  └─ host triggers persona reveal
      ↓
revealed
      ├─ persist group snapshot
      └─ persist participant results
```

`open` 的 provisional UI substate 只由目前資料推導，不新增 database status。

## 3. Host-as-participant ownership

### Auth

- Host 建房後沿用目前 anonymous auth user。
- 「我先玩」不得再建立第二個 anonymous auth session。
- Host authorization 仍以 `sessions.host_user_id` 判定。
- Participant identity 仍以該場次內的 participant record 判定。

### Participant record

當 Host 選擇「我先玩」：

- 若該 auth user 在此 session 尚無 participant，建立一筆 participant。
- 若已存在，恢復既有 participant，不建立重複 participant。
- Host 的 participant display name 必須走與一般 participant 相同的名稱規則。
- 同一 user 同時具備 Host control 與自己的 participant result 存取權，但不得因此取得其他 participants 的 private result。

## 4. Provisional result ownership

### Provisional persona

- 僅使用該 participant 目前完整 active-question answers。
- 使用既有 persona scoring / tie-break。
- 可以在 `open` 階段顯示。
- 必須明確標示為「暫時人格」或同義狀態。
- 不 persist 到 `participant_results`。
- participant 修改答案後立即視為舊 preview 失效，重新計算。
- 只有自己可以看到自己的 provisional persona。

### Provisional dinner success

- 僅在 complete participant count >= 2 時可計算。
- 使用與正式 Reveal 相同、由 questionnaire version mapping 指定的 dinner-success algorithm。
- 只讀取目前 complete latest responses。
- 不 persist 到 `result_snapshots`。
- 顯示時必須標示「目前局勢／尚未鎖定」。
- participant 加入但未完成，不應改變成功率 sample。
- participant 完成、修改為 incomplete、重新完成或修改答案時，preview 應更新。

### Provisional food consensus

- 只使用目前 complete 且已回答 `food-avoid` 的 participants。
- 使用與正式 food consensus 相同的排除制演算法。
- 不 persist。
- 只有 1 位有效 participant 時，可以呈現為「你目前可以吃」；2 位以上才用「目前大家都能吃」。
- 未回答 `food-avoid` 的 participant 不得被當成什麼都能吃。

## 5. Final result boundary

Host 執行正式 Reveal 時：

1. Session `open → locked`。
2. 所有 open provisional preview 立即成為歷史 UI 狀態，不再更新。
3. 從 locked latest responses 重新建立正式 aggregate。
4. Stage A 顯示正式 dinner success。
5. Host 觸發人格翻牌。
6. Persist `result_snapshots`。
7. Persist complete participants 的 `participant_results`。
8. Session `locked → revealed`。
9. 每位 participant 以 persisted result 取代 provisional persona。

正式結果不得直接沿用 client memory 中的 provisional object 作為 persistence payload，而應重新從 locked source of truth 建立，以避免 race condition。

## 6. Realtime update boundary

Open 階段需要響應以下事件：

- participant joined
- participant completed
- participant answer updated
- participant food-avoid updated
- participant completeness changed

UI derived state：

```text
joinedCount
completedCount
eligibleSuccessSample
eligibleFoodSample
provisionalDinnerSuccess
provisionalFoodConsensus
```

Realtime 只負責觸發重新讀取／重新推導；domain algorithm 不放進 subscription callback。

## 7. Existing participant stability

Late join 發生時：

- 不變更既有 participant id。
- 不清空既有 responses。
- 不把已完成 participant 送回第一題。
- 不重新抽本房 questionnaire；同房仍使用相同 deterministic 12 題與順序。
- 已完成者停留在 provisional result / waiting hub，可自行選擇回去修改。
- 未完成者維持自己原本的進度恢復規則。

## 8. UI flow

### Landing / create

```text
開一局
→ 建立 session
→ 顯示房號 / QR
→ Primary: 我先玩
→ Secondary: 先等朋友
```

文案名稱仍標記 NEEDS_CONFIRMATION；重要的是功能優先序：不再要求 Host 先等待。

### First participant

```text
我先玩
→ participant identity
→ 12 題
→ food-avoid
→ provisional result hub
```

Result hub 在 1 人時至少顯示：

- 暫時 Persona card。
- 「飯局目前只有你」狀態。
- 分享 QR / 房號。
- 不顯示誤導性的 group success 0%。
- 不顯示 soulmate / enemy。

### Multi-participant open hub

當 complete count >= 2：

- 顯示 provisional success preview。
- 顯示 provisional food consensus。
- 顯示 joined / completed counts。
- 可顯示娛樂性「飯局難度」。
- 每次有效樣本改變時顯示簡短更新 cue，例如「局勢變了」。

不得顯示誰選了哪一題。

## 9. Dinner difficulty presentation

此值純粹由 joined participant count 決定，屬 presentation layer，不進 domain scoring：

| Joined | Label | Example copy |
|---:|---|---|
| 1 | EASY | 最大的敵人是自己 |
| 2 | NORMAL | 友情開始接受考驗 |
| 3–4 | HARD | 有人說「都可以」了 |
| 5–6 | NIGHTMARE | 民主制度開始失效 |
| 7+ | LARGE PARTY | 大型飯局警報 |

Label / copy 可在 UI 階段調整；不得用它影響 dinner success、persona、pairing 或 food consensus。

## 10. Privacy

Open provisional state 仍遵守既有 privacy boundary：

- Host 可以看到 roster 與 completion。
- Public/group preview 只能顯示 aggregate。
- Participant 只能看到自己的 provisional persona。
- 不公開任何 participant 的逐題答案。
- 不因 Host 同時是 participant 而放寬 private result RLS。

## 11. Domain reuse

預期沿用既有 pure functions：

- `isCompleteResponse()`
- `calculateGroupStats()`
- `calculateDinnerSuccessRate()`
- `assignPersona()`
- `calculateSimilarity()`
- food consensus helpers

若實作需要 preview adapter，應組合既有 functions；不得另寫一套 preview scoring。

## 12. Failure / edge cases

### Host 建房後 refresh

- Host 尚未建立 participant：回到 Host lobby，仍可選「我先玩」。
- Host 已建立 participant：恢復該 participant 的 latest answers / provisional hub。

### 第一位玩家完成後朋友加入

- 第一位玩家結果不清空。
- completed count 仍正確。
- 新 participant 從自己的第一題開始。
- 只有新 participant complete 後才進入 success-rate sample。

### 有人已完成後回去改答案

- session = `open` 時允許。
- 修改造成 incomplete 時，暫時退出 provisional aggregate sample。
- 再次 complete 後重新加入 sample。

### Host 在別人作答中鎖定

- 沿用既有規則：incomplete participant 不阻塞。
- 鎖定後停止 open provisional updates。
- final result 只用 locked complete responses。

### 只有 Host 自己一人就鎖定

- 既有 Reveal 可進行，但團體成功率仍顯示樣本不足。
- Persona final reveal 可為唯一 complete participant 建立 persona。
- 不建立 pairing。

### Session 已 locked / revealed

- 不接受新 participant。
- 不顯示 open provisional UI。
- 使用既有 locked / persisted result flow。

## 13. Testing strategy

### Unit

新增至少：

- host-as-participant identity 不重複。
- 1 complete participant 不計算 group success。
- 2+ complete participants 的 provisional success 與 final algorithm 一致。
- incomplete participant 不進 provisional aggregate。
- participant 修改答案後 provisional preview deterministic 更新。
- provisional food consensus 使用 complete + food-avoid sample。
- 只有 1 participant 時 pairing 為空。

### Playwright

新增案例至少涵蓋：

1. Host 建房 → 我先玩 → 完成 → 看 provisional persona。
2. 單人 provisional hub 仍可分享 / 第二人可加入。
3. 第二人加入不重置第一人的進度與答案。
4. 第二人 complete 後 provisional group preview 出現。
5. open 時修改答案會更新 provisional preview。
6. Host lock 後 late join / answer edit 仍被拒。
7. final Reveal 重新建立正式結果，participant 由 provisional persona 切到 persisted persona。
8. Host-as-participant 不可讀到其他人的 private participant result。

## 14. Validation gate

本 change 完成前至少執行：

1. `pnpm test:unit`
2. `pnpm typecheck`
3. `pnpm build`
4. `pnpm test:e2e`
5. 多 browser 驗證 Host 同時是 participant。
6. 1 人 → 2 人 → 3+ 人加入的 Realtime smoke test。
7. 確認 locked / revealed late-join boundary 無 regression。
8. OpenSpec strict validation。
9. 驗證 README 與現行 runtime 狀態描述沒有把未實作功能寫成已完成。
