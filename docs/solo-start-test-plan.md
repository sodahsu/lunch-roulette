# Lunch Roulette《都可以？》Solo Start｜測試計劃

> Scope：`task/solo-start`
>
> Source of truth：`HANDOFF.md` + `openspec/changes/solo-start/`
>
> Current release state：**IMPLEMENTATION PRESENT / VALIDATION BLOCKED**

## 1. 目的

驗證同一個 session 可以從 1 人自然成長到 N 人，且不破壞既有兩段式 Reveal、privacy / RLS、food consensus、persona / pairing 與 deterministic scoring contract。

核心流程：

```text
Host 建立飯局
→ 我先玩
→ Host 同時成為第一位 participant
→ 完成本局問卷 + food-avoid
→ open 階段看到自己的 provisional Persona
→ 房間維持 open，可分享 QR / 房號
→ 後加入者不重置既有 participant
→ 2+ complete 後 Host Control Room 顯示 provisional group preview
→ Host lock
→ 正式結果從 locked source of truth 重建
→ Stage B 才 persist participant_results / result_snapshots
→ revealed
```

## 2. 規格追溯優先序

1. **Capability contract**
   - `openspec/changes/solo-start/specs/live-session/spec.md`
   - `openspec/changes/solo-start/specs/result-reveal/spec.md`
   - `openspec/changes/solo-start/specs/food-consensus/spec.md`
2. **Architecture / invariant**
   - `openspec/changes/solo-start/design.md`
3. **目前真實執行狀態**
   - `HANDOFF.md`
4. **工作清單**
   - `openspec/changes/solo-start/tasks.md`

`tasks.md` 是 checklist，不得在與 HANDOFF / CI 證據衝突時當作 runtime 真相來源。

## 3. 不可破壞的 invariant

- 不新增新的 `sessions.status`；維持 `open → locked → revealed`。
- provisional result 是 derived state，不 persist 到正式 `participant_results` / `result_snapshots`。
- Final result 必須從 locked latest responses 重建，不沿用 client 內舊 provisional object。
- complete participant < 2 時不得顯示 group dinner-success percentage。
- 只有 1 位 participant 時不得建立 soulmate / opposite。
- incomplete participant 不進 group success sample。
- 未回答 `food-avoid` 不得被當成「什麼都能吃」。
- Participant 只看自己的 provisional / formal Persona；不讀其他人的 private result。
- Host-as-participant 不因此取得其他 participant 的 private result。
- Preview 與 Final 共用既有 domain algorithm，不建立第二套 scoring。

## 4. Requirement-to-test matrix

| ID | 規格 / HANDOFF 行為 | Unit | Service / Integration | E2E / Runtime | 目前狀態 |
|---|---|---|---|---|---|
| SS-01 | Host 可成為第一位 participant | 不適合 | Host identity 建立 / 恢復 | CASE-19 | E2E NOT_FULLY_VERIFIED |
| SS-02 | Host 重進不得重複 participant | 不適合 | participant uniqueness / restore | 補 runtime smoke | NOT_FULLY_VERIFIED |
| SS-03 | 1 complete 不算 group success % | UT-SOLO-01 | - | CASE-19 | Unit covered |
| SS-04 | 1 participant 不建立 pairing | UT-SOLO-02 | - | final single-player smoke | Unit covered |
| SS-05 | 2+ complete 用正式同一 success algorithm | UT-SOLO-03 | - | CASE-20 | Unit covered |
| SS-06 | incomplete / late join 未完成者不影響 aggregate | UT-SOLO-04 / 05 | response state | CASE-20 | Unit covered；E2E 未完整驗證 |
| SS-07 | 修改答案後 provisional 依 latest answers 重算 | UT-SOLO-06 | latest response persistence | 補 E2E | Unit added |
| SS-08 | complete → incomplete 應退出 success sample | UT-SOLO-07 | response completeness trigger | 補 E2E | Unit added |
| SS-09 | food unanswered 不視為 eats-anything | UT-SOLO-08 | response persistence | food smoke | Unit covered |
| SS-10 | food-avoid 修改後 provisional consensus 重算 | UT-SOLO-09 | latest food response | 補 E2E | Unit added |
| SS-11 | provisional deterministic | UT-SOLO-10 | - | - | Unit added |
| SS-12 | provisional 不成為 final source of truth | UT-SOLO-11 / 12 | result persistence boundary | CASE-01 + CASE-21 | Unit added；E2E blocked |
| SS-13 | late join 不重置既有 identity / answers / progress | pure unit 不足 | 必須 | CASE-20 | E2E NOT_FULLY_VERIFIED |
| SS-14 | provisional 不 persist 正式 results | pure unit 不足 | 必須 | CASE-19 / 20 | NOT_FULLY_VERIFIED |
| SS-15 | Host-as-participant privacy | 不適合 | RLS / ownership | CASE-21 + privacy smoke | NOT_FULLY_VERIFIED |
| SS-16 | 正式兩段 Reveal contract 不 regression | domain 只保護計算 | persistence boundary | CASE-01 | **BLOCKED** |

## 5. Unit test cases

### UT-SOLO-01｜單人不產生 group success

Given：1 位 complete participant。  
Then：
- `sampleSize = 1`
- `dinnerSuccess = null`
- 不以 `0%` 表示樣本不足。

### UT-SOLO-02｜單人 pairing 為空

Given：只有一位 complete participant。  
Then：
- `soulmates = []`
- `opposites = []`

### UT-SOLO-03｜2+ complete 使用正式同一演算法

Given：2 位 complete participant。  
Then：

```ts
preview.dinnerSuccess ===
calculateDinnerSuccessRate(calculateGroupStats(rows), questionnaireVersion)
```

### UT-SOLO-04｜incomplete participant 不進 aggregate

Given：1 complete + 1 incomplete。  
Then：question sample size 仍為 1。

### UT-SOLO-05｜未完成 late joiner 不改變 provisional preview

Given：原本已有 2 complete。  
When：加入一筆 incomplete response。  
Then：provisional preview 前後相同。

### UT-SOLO-06｜修改答案後依 latest answers 重算

Given：兩位 participant 先有高共識。  
When：其中一位改成另一組完整答案。  
Then：
- preview 重新計算。
- 結果等於對 latest rows 執行正式既有 algorithm。

### UT-SOLO-07｜complete → incomplete 退出 sample

Given：2 complete 時已有 provisional success。  
When：其中一位變 incomplete。  
Then：
- sample size 降為 1。
- `dinnerSuccess = null`。

### UT-SOLO-08｜未回答 food-avoid 不當成「無忌口」

Given：A 回答 hotpot，B 未回答。  
Then：food sample size = 1。

### UT-SOLO-09｜food-avoid 修改後重算

Given：同一 complete participant food-avoid 從 none 改為 hotpot。  
Then：provisional food stat 改變並使用 latest value。

### UT-SOLO-10｜provisional deterministic

Given：完全相同 complete responses。  
Then：重算兩次結果完全相同。

### UT-SOLO-11｜舊 provisional 不污染 final snapshot

Given：先以 A/B 建 provisional。  
When：locked source 改為 A/A。  
Then：
- final snapshot 對應 locked A/A rows。
- 不沿用舊 provisional group stats。

### UT-SOLO-12｜final snapshot deterministic

Given：相同 locked rows。  
Then：重建兩次 snapshot 完全一致。

## 6. 不硬塞進 Unit 的項目

以下涉及 Auth / DB / RLS / Realtime / persistence，必須留在 Service / Integration / E2E：

- Host participant identity 建立與恢復。
- Host 重入不建立第二筆 participant。
- late join 不重置既有 participant identity / answers / progress。
- provisional Persona 不新增 `participant_results`。
- provisional group preview 不新增 `result_snapshots`。
- locked 後拒絕 answer update。
- participant 不能讀其他人的 private result。
- Host-as-participant 不放寬 private result ownership。
- Realtime participant / response / result delivery。

## 7. E2E traceability

### CASE-01｜兩段式 Reveal regression

```text
open
→ Host lock
→ locked
→ success result
→ participant 尚未看到 Persona
→ Host 公開處刑
→ persist formal results
→ revealed
→ participant Persona 出現
```

**目前：BLOCKED**

已知現象：full suite 在 CASE-01 達 240000ms timeout；timeout 後 `closeActors()` 出現 context cleanup error，不足以證明 cleanup 是 root cause。

### CASE-19｜Host 單人直接開局

對應：
- Host 可成為第一位 participant。
- open complete participant 可看 private provisional Persona。
- 1 complete 不顯示 group success %。

### CASE-20｜Late join + provisional group preview

對應：
- 第一位 complete 後房間仍 open。
- Guest 後加入不重置 Host。
- Guest complete 後 sample = 2。
- Host Control Room 顯示 provisional success。

### CASE-21｜Host-as-participant final Reveal

對應：
- final persisted Persona 取代 provisional Persona。
- Host 保留 control room。
- Host 可查看自己的 formal Persona。
- Guest 正常取得 formal Persona。

## 8. CASE-01 Codex debug plan

Codex 第一個工作不是再加 timeout，而是找出最後一個成功 checkpoint：

```text
A Host room created
B Amy joined
C Ben joined
D Amy complete
E Ben complete
F Host completed metric = 2
G Host click lock
H session locked
I success-score visible
J Amy waiting
K Ben waiting
L Host click 公開處刑
M session revealed
N Amy Persona visible
O Ben Persona visible
```

要求：

1. 先得到「最後一個 PASS checkpoint」。
2. 隔離真正 owner layer：UI / session-service / Supabase write / Realtime / test helper。
3. 做最小 root-cause fix。
4. 禁止用 arbitrary sleep、無證據 polling fallback 或單純增加 timeout 掩蓋問題。
5. CASE-01 單跑 PASS 後才跑 full E2E。

## 9. Runtime smoke

自動化全綠後至少驗證：

### Smoke A｜1 人
Host → 我先玩 → complete → provisional Persona → 無 group success。

### Smoke B｜1 → 2
Guest join 不重置 Host；Guest complete 後 provisional group preview 出現。

### Smoke C｜2 → 3+
第三人 incomplete 時 aggregate 不變；complete 後 aggregate 更新。

### Smoke D｜Final
lock → provisional 停止 → Stage A → Stage B → persisted results。

### Smoke E｜Privacy
至少兩個 browser contexts；Participant A 不能看到 Participant B private result。

## 10. Completion gate

只有以下全部成立，Solo Start 才可標記完成：

- [ ] `pnpm test:unit` PASS
- [ ] `pnpm typecheck` PASS
- [ ] `pnpm build` PASS
- [ ] OpenSpec strict PASS
- [ ] `pnpm test:e2e` full suite PASS
- [ ] 1 → 2 → 3+ runtime smoke PASS
- [ ] Host-as-participant multi-browser smoke PASS
- [ ] locked / revealed late-join regression PASS
- [ ] privacy / RLS regression PASS
- [ ] README / tasks / HANDOFF 與 runtime 證據一致
- [ ] archive readiness review 完成

在此之前：

- 不 archive `solo-start`。
- 不宣稱 release-ready。
- 不建立正式 GitHub Release。
