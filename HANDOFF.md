---
title: "Lunch Roulette MVP｜本機 Codex 工作交接"
date: "2026-09-29"
handoff_status: ready_for_handoff
---

# Lunch Roulette MVP｜本機 Codex 工作交接

## Resume Here

**交付定位：**程式與 OpenSpec 已更新到兩段式 Reveal；下一步是 runtime 驗證，不要再改 Reveal 時序。

**實作快照 HEAD（HANDOFF 更新前）：** `36d576a51b249f0131c40a382368553094555bb5`

### 目前產品高潮

```text
大家答題
↓
Host：鎖定並揭曉
↓
session = locked
↓
所有手機進入等待
↓
Host 大螢幕 3 / 2 / 1
↓
大螢幕顯示「我們這團今晚約成飯的成功率」
↓
session 仍然 locked
↓
手機仍然不能看到 persona
↓
Host：翻出所有人格卡
↓
persist group snapshot + participant results
↓
session = revealed
↓
所有完成者手機 Realtime 自動翻 persona
```

### 本次已實作

- 團體指標從「飯局相容度」改名為 **今晚約成飯的成功率**。
- Domain function 改為 `calculateDinnerSuccessRate()`。
- 成功率為 deterministic game score，不宣稱是統計校準的真實機率模型。
- `previewLockedGroupStats()`：locked 時只讀 responses 計算 aggregate preview，不提前 persist persona。
- Host Reveal 改成兩段：
  1. 倒數後只顯示成功率。
  2. Host 按「翻出所有人格卡」後才呼叫 `finalizeReveal()`。
- 成功率畫面出現時 session 保持 `locked`。
- Participant 在 locked 全程維持等待畫面。
- final persona reveal 後才切 `revealed`。
- 手機 persona card 只顯示：
  - persona
  - 靈魂飯友
  - 飲食天敵
- 團體成功率只留在 Host / 大螢幕。
- 少於 2 位 complete participant 時 UI 顯示「樣本不足」，不顯示誤導性的 `0%`。
- Playwright CASE-01 已改成驗證：
  - success rate 先出
  - participant 還在 waiting
  - persona 尚不存在
  - Host 翻牌
  - participant 才同步 persona
- OpenSpec proposal / live-session / result-reveal / design / tasks 已同步。

## Stable Contract

| 規則 | 狀態 |
|---|---|
| `open → locked → revealed` | 保留 |
| 成功率畫面屬於 `locked` 階段 | 必須 |
| Host 未翻人格卡前 participant 不得看到 persona | 必須 |
| `finalizeReveal()` 只由 persona reveal 觸發 | 必須 |
| locked 後禁止 answer update / late join | 保留 |
| public host 畫面不顯示個人逐題答案 | 保留 |
| persona / pairing deterministic | 保留 |
| v0.2：24 題庫，每房 12 題 | 保留 |
| v0.1 舊房間維持原 8 題 | 保留 |

## 主要程式 owner

```text
src/App.vue
  reveal()
  continueReveal()
  revealPersonas()
  locked success-rate UI
  participant persona UI

src/lib/session-service.ts
  lockSession()
  previewLockedGroupStats()
  finalizeReveal()

src/domain/domain.ts
  calculateDinnerSuccessRate()
  calculateGroupStats()
  assignPersona()
  calculateSimilarity()

tests/e2e/lunch-roulette.spec.ts
  CASE-01 two-stage reveal order
```

## Runtime 驗證

目前仍為：

| 驗證 | 狀態 |
|---|---|
| npm install | NOT_RUN |
| unit | NOT_RUN |
| typecheck | NOT_RUN |
| build | NOT_RUN |
| Playwright | NOT_RUN |
| Anonymous Sign-ins | UNKNOWN |
| 真實多裝置兩段 Reveal | NOT_RUN |
| Vercel Demo | NOT_STARTED |

本機接手後依序：

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

若 CASE-01 失敗，優先驗證：

1. Host 成功率出現時 session 是否仍為 `locked`。
2. participant 是否仍在 `revealing`。
3. `participant_results` 是否在 Host 按翻牌前被提前寫入。
4. Host 按翻牌後 session 是否切到 `revealed`。
5. Realtime 是否讓 participant 自動進 persona card。

## OpenSpec

已同步：

- `openspec/changes/lunch-roulette-mvp/proposal.md`
- `specs/live-session/spec.md`
- `specs/preference-quiz/spec.md`
- `specs/result-reveal/spec.md`
- `design.md`
- `tasks.md`

目前 archive 仍是 **NOT_READY**：

- runtime validation 尚未執行。
- 「成功率」跨未來程式版本是否必須永久不變仍未決。
- 若要求跨版本不變，需要 persist success summary 或保留 versioned algorithm。

## Verdict

**READY_FOR_HANDOFF**

文件可以接手；程式不可宣稱 runtime PASS，直到 install / unit / typecheck / build / E2E 實際跑完。
