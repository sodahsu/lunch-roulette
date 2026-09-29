---
title: "Lunch Roulette《都可以？》｜AI 工作交接"
date: "2026-09-29"
handoff_status: ready_for_handoff
---

# Lunch Roulette《都可以？》｜AI 工作交接

## Resume Here

**交付定位：**核心多人遊戲、兩段式 Reveal、防冷場 pacing 與 OpenSpec 已實作；下一步先做 runtime 驗證，再進行「酷酷的」視覺改版。

**功能實作快照 HEAD（本次 HANDOFF 更新前）：** `7981d6b257507973b46d46038c1aa874b733fa3d`

```yaml
handoff_purpose: implementation_and_validation
task_state: implementation_written_runtime_unverified
code_changed: true
repository_reverified: true
visual_redesign: pending
```

## 1. 產品一句話

《都可以？》不是餐廳推薦器，而是多人飯局人格社交遊戲。

核心：

> 8 個人都說自己很好約，最後看看這團今晚到底有多大機會真的約成一頓飯，以及誰才是真的「都可以」。

---

## 2. 正式遊戲流程

```text
Host 開房
↓
大螢幕 QR / 房號
↓
Participants 手機加入
↓
輸入暱稱
↓
v0.2：24 題題庫 deterministic 抽本局 12 題
↓
大家答題
├─ 第 4 題：場面觀察
├─ 第 8 題：中場警報
└─ 第 11 題：最後兩題
↓
先完成的人進 waiting
↓
Host 按「鎖定並揭曉」
↓
session = locked
↓
所有手機保持等待
↓
大螢幕 3 / 2 / 1
↓
成功率三拍 Reveal
1. 幾個人自認「超好約」
2. 「但答案比你們誠實」
3. 今晚約成飯的成功率 + verdict
↓
session 仍然 locked
↓
Host 按「公開處刑 🎴」
↓
persist group snapshot + participant results
↓
session = revealed
↓
完成者手機 Realtime 自動翻人格卡
↓
靈魂飯友 / 飲食天敵
↓
大螢幕：
「全部把手機舉起來」
↓
現場互相找飯友 / 天敵
```

---

## 3. 已實作功能清單｜FACT

### Session / Multiplayer

- [x] Host 建立房間。
- [x] 6 碼房號。
- [x] QR Code 加入。
- [x] 暱稱加入，不需要一般帳密註冊流程。
- [x] 約 8 人是主要規模，但不是 hard limit。
- [x] 第 9 人仍可加入。
- [x] Realtime participant / response / result 更新。
- [x] `open → locked → revealed` 狀態模型。
- [x] locked / revealed 後禁止新 participant。
- [x] locked 後禁止答案修改。
- [x] Host 不需要等所有 participant 完成即可 Reveal，但至少需 1 位完成者。

### Questionnaire v0.2

- [x] 24 題題庫。
- [x] 6 類，每類 4 題。
- [x] 每房 deterministic 抽 12 題。
- [x] 每類固定 2 題。
- [x] `self-image` 每局必出。
- [x] 同一房間所有人取得同一組題目與順序。
- [x] Reload 不換題。
- [x] v0.1 legacy room 保留原 8 題。
- [x] Complete 判定只依 active questionnaire。

### Persona / Matching

- [x] 8 種 Persona。
- [x] 動物 emoji persona identity。
- [x] Option score 加總。
- [x] Highest score wins。
- [x] Tie 使用固定 `PERSONA_PRIORITY`。
- [x] 不使用 threshold。
- [x] Persona deterministic。
- [x] Similarity = active questions 完全相同答案比例。
- [x] 靈魂飯友 = highest similarity。
- [x] 飲食天敵 = lowest similarity。
- [x] 並列全部保留。
- [x] 不與自己 pairing。
- [x] Incomplete participant 不硬判 persona。

### 今晚約成飯的成功率

Domain owner：

`calculateDinnerSuccessRate()`

公式：

```text
questionAgreement = max(optionCounts) / sampleSize

Dinner Success Rate
= round(mean(questionAgreement) * 100)
```

Verdict：

| Score | 顯示 |
|---:|---|
| 80–100 | 今晚直接出門，不要再討論 |
| 68–79 | 今晚約得成，找一個人負責訂位 |
| 56–67 | 約得成，但不要再開全民表決 |
| 0–55 | 有機會約成，先指定飯局隊長 |

- [x] 這是 deterministic **game score**。
- [x] 不宣稱是統計校準過的真實事件機率。
- [x] 少於 2 位 complete participants 顯示「樣本不足」，不是誤導性的 `0%`。

---

## 4. Reveal Contract｜禁止改壞

### Stage A｜大螢幕

```text
Host：鎖定並揭曉
↓
open → locked
↓
Participants 全部 waiting
↓
3 / 2 / 1
↓
成功率三拍 Reveal
```

此時：

- session **必須仍是 `locked`**。
- participant 手機 **不得出現 Persona**。
- `participant_results` 不應因成功率畫面提前曝光。

### Stage B｜手機人格

只有 Host 按：

> **公開處刑 🎴**

才：

```text
finalizeReveal()
↓
persist result_snapshots
↓
persist participant_results
↓
locked → revealed
↓
Realtime
↓
手機自動 Persona
```

Stable constraints：

- [x] `finalizeReveal()` 只由 final Persona Reveal 觸發。
- [x] Host 未公開處刑前，participant 不得看到 Persona。
- [x] 手機不需要另外按「查看結果」。
- [x] 手機 Persona 頁專心顯示個人結果，不重複團體成功率。
- [x] Public Host 畫面不可揭露「某人某題選什麼」。

---

## 5. 防冷場 Pacing｜已實作

### Join / Lobby

Host 會依目前狀態顯示趣味文案，例如：

- 「等待第一位受害者掃碼…」
- 「目前 6 個人聲稱自己很好約。」
- 「5 人已交卷，還有 2 人正在跟自己辯論。」

只使用公開的 join / completion counts。

### Quiz

固定節奏點：

- [x] 第 4 題：場面觀察。
- [x] 第 8 題：中場警報。
- [x] 第 11 題：最後兩題。

這些 event：

- 不改答案。
- 不改 scoring。
- 不引用個人真實選項。
- 純 UI pacing。

### Waiting

Participant 交卷後：

- 顯示完成比例。
- 依剩餘人數吐槽。
- Session open 時仍可回去修改答案。

### Success Reveal

不是：

`3 → 2 → 1 → 78%`

而是：

```text
7 / 8 人自認「超好約」
↓
但答案比你們誠實
↓
實際成功率是……
↓
78%
↓
今晚約得成，找一個人負責訂位
```

### Persona Reveal 後

Host 大螢幕：

> 全部把手機舉起來。  
> 先找到你的靈魂飯友，再找飲食天敵。

---

# 6. 視覺改版交接｜PENDING IMPLEMENTATION

使用者已明確要求：

> **設計風格要酷酷的。**

目前程式的整體視覺仍偏米白、圓角、可愛型 UI。

**以下是下一輪視覺設計目標，尚未實作，不得標成完成。**

## Target Direction

**Dark Editorial × Food Personality × Social Experiment**

一句話：

> **黑色設計展 × 飯局社交實驗 × 動物人格收藏卡**

### Visual Keywords

- dark editorial
- social experiment
- collectible card
- food personality
- contemporary design exhibition
- restrained absurdity
- bold typography
- high contrast
- experimental dashboard
- sophisticated animal character

### Color direction

建議基礎：

```text
Background      #0B0B0C
Surface         #151517
Surface 2       #202024
Primary text    #F5F5F2
Muted text      #8E8E93

Electric Blue   #4C6FFF
Acid Lime       #C7FF3D
Alert Red       #FF493D
```

Accent 不要大量彩虹化。

## 視覺實作 Checklist

### Global

- [ ] 米白背景改成深色 editorial system。
- [ ] 建立統一 dark surface / border / typography tokens。
- [ ] 降低大圓角與「可愛 App」感。
- [ ] 大量使用 oversized typography。
- [ ] Emoji 只做輔助，不作為主要品牌視覺。
- [ ] 保持 WCAG 可讀性與 focus-visible。
- [ ] 保持 mobile-first。
- [ ] 保持 `prefers-reduced-motion`。

### Landing

目標：

```text
10/1 SOCIAL EXPERIMENT

都
可
以
？

8 個人都說自己很好約。
今晚看看誰在說謊。
```

- [ ] 移除首頁巨大 🍜 emoji 主視覺。
- [ ] 「都可以？」改成巨大 typography。
- [ ] Primary CTA：加入飯局。
- [ ] Host Mode 降低視覺權重。
- [ ] 不做一般 SaaS hero。

### Host Lobby

目標像：

**Social Experiment Control Room**

- [ ] QR 做成主視覺之一。
- [ ] Room code 超大字。
- [ ] Participant list 改成 experimental roster。
- [ ] READY / THINKING 狀態更像儀表板。
- [ ] 加入事件可用「SUBJECT CONNECTED」式視覺。
- [ ] 遠距離投影仍須易讀。

### Quiz

- [ ] 一題一屏。
- [ ] A / B 選項改成大型矩形。
- [ ] 選中採高反差 invert。
- [ ] 降低 rounded card feel。
- [ ] 第 4 / 8 / 11 題 event 改成短暫 full-screen interstitial。

Event visual direction：

```text
MINORITY DETECTED

有人開始逆風了。
先不要找戰犯。
```

```text
CONSENSUS
IS
COLLAPSING

共識正在崩壞。
```

```text
FINAL
TWO

友情還有兩題可以挽救。
```

### Dinner Success Reveal

這是全場最大視覺高潮。

- [ ] 減少 dashboard 卡片。
- [ ] 每一拍只呈現一個核心訊息。
- [ ] 7 / 8 自認好約 → 單獨一畫面。
- [ ] 「BUT / 答案比你們誠實」→ 單獨一畫面。
- [ ] 78% → 超大型 typography。
- [ ] `DINNER SUCCESS RATE` 可作 secondary label。
- [ ] 「公開處刑」成為明確 final CTA。
- [ ] 不做過度 Cyberpunk neon animation。

### Persona Card

目標：

**Collectible Identity Card**

Card 可以包含：

```text
TYPE 06

[Animal Character]

五百公尺極限派
HOME RADIUS TYPE

超過兩個路口，就是遠。

MATCH   AMY
ENEMY   KEVIN
```

- [ ] 卡片使用統一黑 / 白 / Electric Blue 系統。
- [ ] 每個 Persona 只換局部識別色。
- [ ] 不做 8 張完全不同的彩虹 theme。
- [ ] 動物角色維持同一材質、視角、光線與插畫語言。
- [ ] 角色插畫應是 sophisticated，不是兒童卡通。
- [ ] Persona Card 必須 screenshot-worthy。
- [ ] 手機小尺寸也要清楚。
- [ ] 未來若整合生成圖，圖片不要含文字、Logo、UI、浮水印。

### Avoid

不要做成：

- [ ] 紫粉 AI SaaS。
- [ ] Cyberpunk 滿版霓虹。
- [ ] 彩虹遊戲 UI。
- [ ] 每個 Persona 一套完全不同配色。
- [ ] 兒童卡通風。
- [ ] Apple Fitness 彩色圓環。
- [ ] 一堆 dashboard 小卡。
- [ ] 一般餐廳推薦 App。

---

## 7. OpenSpec

目前已同步：

- `openspec/changes/lunch-roulette-mvp/proposal.md`
- `openspec/changes/lunch-roulette-mvp/design.md`
- `openspec/changes/lunch-roulette-mvp/tasks.md`
- `specs/live-session/spec.md`
- `specs/preference-quiz/spec.md`
- `specs/result-reveal/spec.md`

FACT：

- 兩段式 Reveal 已進 spec。
- 防冷場 pacing 已進 spec。
- v0.2 24 → 12 題題組已進 spec。

PENDING：

- 視覺 dark-editorial redesign **尚未寫進正式 OpenSpec capability requirement**。
- 若下一輪開始實作視覺，需同步 design/tasks；純視覺 token 可留 design，若改變 interaction behavior 則同步 capability spec。

---

## 8. Automated Test Code

已寫：

- [x] Vitest domain tests。
- [x] Playwright CASE-01～09。

重點：

### CASE-01

```text
Host lock
↓
成功率先出
↓
Participants 仍 waiting
↓
Persona 不存在
↓
Host 公開處刑
↓
手機同步 Persona
```

### CASE-09

- 驗證第 4 題 pacing event 出現。

注意：

**Test code 已寫 ≠ runtime PASS。**

---

## 9. Runtime Validation Checklist

目前狀態：

| 驗證 | 狀態 |
|---|---|
| `npm install` | NOT_RUN |
| lockfile 產生 | NOT_RUN |
| `npm run test:unit` | NOT_RUN |
| `npm run typecheck` | NOT_RUN |
| `npm run build` | NOT_RUN |
| `npm run test:e2e` | NOT_RUN |
| Anonymous Sign-ins | UNKNOWN |
| 真實多裝置 Reveal | NOT_RUN |
| 防冷場 pacing 實機節奏 | NOT_RUN |
| Dark visual redesign | NOT_STARTED |
| Vercel Demo | NOT_STARTED |

本機接手第一輪：

```bash
git status
git switch main
git pull --ff-only
npm install
npm run test:unit
npm run typecheck
npm run build
npm run test:e2e
```

### Runtime smoke test 必看

- [ ] 同房所有 client 都拿到相同 12 題。
- [ ] v0.1 舊房仍是 8 題。
- [ ] 第 4 / 8 / 11 題 pacing 不影響作答。
- [ ] Participant waiting copy 正常。
- [ ] Host lobby copy 正常。
- [ ] Host lock 後所有 participant 立即離開 quiz。
- [ ] 成功率出現時 session 還是 `locked`。
- [ ] 成功率三拍節奏不過快／不過慢。
- [ ] 公開處刑前手機看不到 Persona。
- [ ] 公開處刑後所有完成者同步 Persona。
- [ ] Incomplete participant 顯示「你沒有答完」。
- [ ] Refresh 後 Persona 不變。
- [ ] Host 公開畫面沒有 per-person answers。
- [ ] 9 人場次可正常運作。

---

## 10. Supabase

Project：

`hvaxoopyccwsqmhjnibg`

目前 client 使用：

`supabase.auth.signInAnonymously()`

UNKNOWN：

**Anonymous Sign-ins provider 是否 Enable 尚未 runtime 驗證。**

不要在未驗證前宣稱已開啟。

目前這輪視覺／pacing 改動：

- 沒有新增 DB schema。
- 沒有改 RLS。
- 沒有新增 migration。

---

## 11. Vercel

目前沒有已驗證的 `lunch-roulette` Vercel Demo。

Root `vercel.json` intent：

- 只有 `main` deployment enabled。
- feature / PR branch 不部署。

需要的一次性設定仍待完成：

- Import `sodahsu/lunch-roulette`
- Vite
- Build：`npm run build`
- Output：`dist`
- Production branch：`main`
- Env：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

不可把 service-role secret 放到 frontend。

---

## 12. Branch / Repo

Repository：

`sodahsu/lunch-roulette`

Integration branch：

`main`

使用者要求：

> 最終保留單一 main。

舊 remote branch 清理之前曾因工具限制未完成。

所以：

- 不要假設舊 branch 已刪掉。
- 若要清 branch，先重新列出 remote branches。
- 不要直接依舊交接紀錄盲刪。

---

## 13. Next Action

### Priority 1｜Runtime correctness

- [ ] install
- [ ] unit
- [ ] typecheck
- [ ] build
- [ ] E2E
- [ ] Anonymous Auth
- [ ] 2～3 browser smoke test

### Priority 2｜Dark visual redesign

在 runtime baseline 可啟動後，依第 6 節執行。

建議 implementation order：

```text
1. Global design tokens
2. Landing
3. Host lobby
4. Quiz / pacing events
5. Dinner success Reveal
6. Persona collectible card
7. Waiting / incomplete states
8. Responsive QA
9. Reduced-motion QA
```

視覺改版時不要更改：

- domain scoring。
- session state。
- Reveal ordering。
- DB schema。
- RLS。
- questionnaire selection。

除非另有產品需求。

### Priority 3｜Deploy

- [ ] Vercel project。
- [ ] production env。
- [ ] real-phone smoke test。
- [ ] QR code join。
- [ ] 投影／大螢幕 readability。

---

## 14. PENDING DECISION

### Success-rate cross-version persistence

目前：

`group_stats` 有 persist。

`Dinner Success Rate` 是 client 依公式 derive。

因此未來如果改演算法，舊 revealed room 的 score 理論上可能改變。

尚未決定：

1. Persist success summary。
2. 依 `questionnaire_version` 保留 versioned algorithm。

在此決策與 runtime validation 完成前：

**OpenSpec archive = NOT_READY**

---

## 15. 交付狀態

### FACT

- 核心遊戲程式已寫。
- v0.2 question bank 已寫。
- 兩段式 Reveal 已寫。
- 防冷場 pacing 已寫。
- Test code 已寫。
- OpenSpec 已同步目前 gameplay。
- 本交接已補上下一輪 dark editorial 視覺需求。

### NOT_RUN / UNKNOWN

- Runtime tests 尚未執行。
- Anonymous Auth enable 狀態未知。
- 真機多人同步未驗證。
- Dark visual redesign 尚未實作。
- Vercel production demo 尚未建立。
- remote branches 是否只剩 main 尚未重新驗證。

## Verdict

**READY_FOR_HANDOFF**

這代表下一個 Agent 可以安全接手，不代表程式已通過 runtime 驗收。
