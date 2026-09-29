---
title: "Lunch Roulette MVP｜本機 Codex 工作交接"
date: "2026-09-29"
handoff_status: ready_for_handoff
---

# Lunch Roulette MVP｜本機 Codex 工作交接

## Resume Here

**交付定位：**這份檔案是給本機 Codex 直接接手的「目前真實狀態快照」。先驗證，再修錯，再部署；不要把 NOT_RUN 寫成 PASS。

### 目前目標

完成 10/1 設計交流會可實際使用的多人 Lunch Roulette /「都可以？」MVP：

1. 主持人開房。
2. 多位參與者以手機匿名加入。
3. 每人逐題作答，答案會真的寫進 Supabase。
4. Reveal 前可修改答案。
5. 主持人按 Reveal 後：`open → locked → revealed`。
6. `locked` 時所有手機只顯示「人格計算中」，不得提前看到人格。
7. `revealed` 後每支手機透過 Realtime 自動切換成自己的 persisted 人格卡。
8. 主持人大螢幕負責搞笑的結算／倒數效果。
9. 最後部署一個可供手機打開的 Demo URL。
10. Vercel 只能由 `main` 觸發部署，功能分支／PR 不部署。

### 第一個安全動作

在本機 repo 先確認工作區，不要 reset / stash / clean 任何未知變更：

```bash
git status
git branch --show-current
git log -1 --oneline
```

確認沒有要保留的本機變更後，再同步主分支：

```bash
git switch main
git pull
```

### 停止條件

以下任何一項發生時，只停止受影響步驟，不要用繞過方式硬做：

- 本機有來源不明的 staged / unstaged / untracked 變更。
- `npm run test:unit`、`npm run typecheck` 或 `npm run build` 有錯。
- Supabase Anonymous Sign-ins 尚未啟用，導致 `signInAnonymously()` 失敗。
- 為了讓流程通過而需要放寬 RLS、公開私人答案或私人結果。
- Vercel 尚未建立 `lunch-roulette` Project；不要把「repo 有 vercel.json」誤認成已經有 Demo URL。

```yaml
handoff_purpose: implementation_verification_and_deploy
task_state: in_progress
code_changed_before_this_handoff: true
this_handoff_change: documentation_only
repository_reverified: true
approval_evidence:
  - "使用者要求本機 Codex 接手"
  - "使用者要求合併到 main"
  - "使用者要求只有 main 觸發部署"
```

---

## 1. Repository 快照

| 項目 | 目前狀態 | 證據 |
|---|---|---|
| Repo | `sodahsu/lunch-roulette` | GitHub connector |
| Default / integration branch | `main` | GitHub |
| 本次查核 main HEAD | `13d326c728f541cb908d2ea312fb8307751209b8` | `compare main...main` |
| OpenSpec | 已存在 | `openspec/changes/lunch-roulette-mvp/` |
| Vue app | 已存在 | `src/App.vue` |
| Supabase client | 已存在 | `src/lib/supabase.ts` |
| DB migrations | 已存在 | `supabase/migrations/` |
| Domain unit test file | 已存在 | `src/domain/domain.test.ts` |
| Playwright config | 已存在 | `playwright.config.ts` |
| Vercel config | 已存在 | `vercel.json` |
| npm lockfile | **不存在** | 本次查核找不到 `package-lock.json` |

> 本次只查 GitHub remote。**本機 worktree / dirty state 未查核**，所以接手後第一步一定要跑 `git status`。

---

## 2. 已完成且有證據的內容

### E01｜Supabase live project

- 分類：**FACT**
- Project：`lunch-roulette`
- Project ref：`hvaxoopyccwsqmhjnibg`
- Region：`ap-northeast-1`（Tokyo）
- Status：`ACTIVE_HEALTHY`
- PostgreSQL：17
- 本次複核時間：2026-09-29
- 來源：Supabase connector `list_projects`

### E02｜Supabase Security Advisor

- 分類：**FACT**
- 結果：**0 security lints**
- 來源：Supabase connector `get_advisors(type=security)`
- 本次複核：PASS

### E03｜真實資料流程曾實測

- 分類：**FACT（本對話先前實際執行）**
- 已驗證：
  - session / participant / response 可以寫進 live DB。
  - `is_complete=true` 會透過 trigger 更新 participant `completed_at`。
  - participant 能看同房參與者，但只能讀自己的 response。
  - host 能讀 hosted room 的所有 responses。
  - outsider 看不到 room participants / responses。
  - session locked 後 participant update response 影響 0 rows。
  - session locked 後直接 insert participant 被 RLS 拒絕，回 42501。
- 注意：本次「重寫交接檔」沒有重新跑上述 SQL；不要把它寫成今天本機已重驗。

### E04｜同步 Reveal 已實作

- 分類：**FACT（repo 實作）**
- 核心時序：
  - `open`：可答題／可修改。
  - `locked`：答案凍結，參與者手機切到等待揭曉。
  - `revealed`：手機才載入自己的 persisted result 並自動切到人格卡。
- 主要 owner：
  - `src/lib/session-service.ts`
    - `lockSession()`
    - `finalizeReveal()`
  - `src/App.vue`
    - Realtime session refresh
    - participant waiting state
    - host reveal countdown
    - participant persona result view
- 主持人如果在 `locked` 時重新整理，UI 有「繼續揭曉」恢復路徑。
- **Browser E2E 尚未實跑。**

### E05｜只有 main 允許 Vercel Git deployment

- 分類：**FACT（repo config）**
- `vercel.json`：

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": {
    "deploymentEnabled": {
      "*": false,
      "main": true
    }
  }
}
```

- 代表 repo 已要求：
  - `main`：允許 Git deployment。
  - 其他 branch / PR：不部署。
- **這只代表設定存在，不代表 Vercel Project 已建立。**

---

## 3. 尚未完成／不能宣稱完成

### Runtime 驗證

| 驗證 | 狀態 | 指令／方法 |
|---|---|---|
| install | NOT_RUN | `npm install` |
| unit test | NOT_RUN | `npm run test:unit` |
| typecheck | NOT_RUN | `npm run typecheck` |
| production build | NOT_RUN | `npm run build` |
| Playwright | NOT_RUN | `npm run test:e2e` |
| 8 人同時在線 | NOT_RUN | 多 browser context / 多手機實測 |
| Reveal 全員同步 | NOT_RUN | host + participant E2E |
| Refresh 後 persisted persona 一致 | NOT_RUN | reveal 後刷新實測 |

前一個執行環境無法完成 npm runtime 驗證，因此這些項目一定要由本機 Codex 補完。

### OpenSpec 尚未完成項目

依目前 `openspec/changes/lunch-roulette-mvp/tasks.md`：

- 正式題數與題目內容尚未正式確認。
- persona 名稱 / score 規則 / tie-break 尚未正式定稿。
- similarity 第一版計算方式尚未正式定稿。
- 「同一 participant 修改後採 latest response」的 unit test 尚未補。
- persona threshold 邊界 test 尚未補。
- Anonymous participant 真正從前端加入 open session 尚未完成 runtime 驗證。
- Playwright CASE-01 ～ CASE-08 全部尚未實跑。
- final diff review / archive readiness 尚未完成。

> 不要為了讓 task 全勾滿就自行發明 threshold 或業務規則。未知規則維持 NEEDS_CONFIRMATION。

---

## 4. Supabase：接手時最重要的 blocker

### Anonymous Sign-ins

- 狀態：**UNKNOWN / 需要 Dashboard 或 runtime 確認**
- 前端目前會呼叫：

```ts
supabase.auth.signInAnonymously()
```

- 如果 Supabase Authentication 沒有開 Anonymous Sign-ins，Demo 首次開房／加入就會失敗。
- 接手後應直接以 runtime 驗證，不要只看 UI 推測。

### 驗證方式

先啟動本機 app，再真的操作「開房」：

```bash
npm run dev
```

如果 anonymous auth 被關閉，應會在登入階段收到 Supabase Auth error。

需要人工設定時：

**Supabase Dashboard → Authentication → Providers → Anonymous → Enable**

---

## 5. Vercel / Demo URL：目前真實狀態

### E06｜目前沒有 lunch-roulette Vercel Project

- 分類：**FACT**
- 本次查核 Vercel team 只看到：
  - `beloved-agent`
- **沒有 `lunch-roulette` Project**
- 因此目前：
  - 沒有正式 Demo URL。
  - 沒有 production deployment 可更新。
  - `vercel.json` 只是在 repo 裡準備好「main only」規則。

### 建立 Demo 的正確下一步

優先選擇「GitHub repo 匯入 Vercel」，因為需求是之後 merge `main` 自動更新同一個 Demo。

Vercel Project 設定：

- Git Repository：`sodahsu/lunch-roulette`
- Project Name：建議 `lunch-roulette`
- Framework：Vite
- Build Command：`npm run build`
- Output Directory：`dist`
- Production Branch：`main`
- Environment Variables：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

repo 目前已有 fallback publishable config，但 deployment 前仍應確認 Vercel env 設定與預期一致；**絕對不要放 service_role / secret key 到前端。**

### 本機 Codex 使用 Vercel CLI 時

先查 CLI 能力，不要猜指令：

```bash
vercel --help
vercel project --help
```

若本機已登入 Vercel，可用 CLI 建立／連結 Project；若沒登入，就改用 Vercel Dashboard 匯入 GitHub repo。

完成第一次 Production deployment 後：

1. 記下 production URL。
2. 用手機實際打開。
3. 確認後續只有 merge / push `main` 會部署。
4. 功能 branch / PR 不應出現 Preview Deployment。

---

## 6. 建議本機 Codex 執行順序

### Phase A｜先把 repo 驗證到可 build

```bash
git status
git switch main
git pull
npm install
npm run test:unit
npm run typecheck
npm run build
```

### Phase B｜若失敗

只處理第一個有意義的錯誤：

1. 重現。
2. 找 root cause。
3. 做最小修正。
4. 重跑失敗指令。
5. 全綠後再進下一項。

不要同時大改 architecture。

### Phase C｜補缺的 domain tests

至少檢查 OpenSpec 尚未完成的：

1. 同一 participant 在 Reveal 前多次修改，最後結果採 latest persisted response。
2. persona scoring 是否真的存在 threshold；如果目前沒有 threshold 規則，不要硬寫假測試，應先回報規格缺口。
3. tie-break 行為與 `PERSONA_PRIORITY` 一致。

### Phase D｜Supabase runtime

用兩個不同 browser context：

- Host A：開房。
- Participant B：加入。
- B 逐題作答。
- A 應即時看到完成數。
- B 回去改答案。
- A Reveal。
- B 在 `locked` 階段只能看到「人格計算中」。
- session `revealed` 後 B 自動翻人格卡。
- B refresh，結果不變。

### Phase E｜多人 case

至少驗：

- 3 人也可 Reveal。
- 8 人正常。
- 第 9 人可加入。
- 有人未完成不阻塞 Reveal。
- locked 後修改失敗。
- public host 畫面不顯示「某個人某一題選什麼」。
- soulmate / opposite 不包含自己。

### Phase F｜建立 Demo URL

只有 A～D 至少可正常跑後，再建立 Vercel Production Project。

完成後更新本檔：

- Vercel Project ID / name。
- Production URL。
- production deployment commit。
- build 結果。
- browser smoke test 結果。

---

## 7. 主持人大螢幕：現在做到哪

### 已有

- 主持人模式。
- 加入人數 / 完成人數。
- Reveal button。
- `locked` 後倒數。
- 搞笑結算文案。
- Refresh 後可以「繼續揭曉」。
- `revealed` 後顯示結果已固定。

### 還可以做，但不是已完成

先前討論過、目前不能假裝已做：

- 「都可以可信度」群體指標。
- 4:4 分裂時的「飲食內戰」提示。
- 有人改答案時的匿名「人格劇烈搖擺」提示。
- 全場一致時的「歷史性共識」。
- 最後頒獎典禮：
  - 真・都可以
  - 最難約
  - 逆風王
  - 五百公尺極限派
  - 美食狂熱者
- 全場 soulmate / nemesis 關係圖。

如果時間很短，**優先保留同步 Reveal 與手機人格卡，不要為了主持人大螢幕特效破壞核心流程。**

---

## 8. 不能破壞的產品／工程規則

| 規則 | 狀態 | 原因 |
|---|---|---|
| 8 人只是預期規模，不是 hard limit | APPROVED | 第 9 人要能加入 |
| Reveal 不等所有人完成 | APPROVED | 未完成者不能阻塞 |
| Reveal 前答案可修改 | APPROVED | latest answer 才是有效答案 |
| `sessions.status` 是時序真相源 | APPROVED / IMPLEMENTED | open → locked → revealed |
| locked 後 DB 層禁止修改 | IMPLEMENTED / DB VERIFIED | 不只 UI disable |
| public 畫面不洩漏個人逐題答案 | APPROVED / RLS IMPLEMENTED | 隱私 |
| participant 只能讀自己 persona result | IMPLEMENTED / RLS | 隱私 |
| Reveal 後結果 persist | IMPLEMENTED | refresh 不重抽 |
| 手機優先、單手操作 | APPROVED | 現場主要裝置 |
| 核心結果 deterministic | APPROVED | AI 不負責 correctness |
| 不加入餐廳 API / 地圖 /會員系統 | MVP NON-GOAL | 控制半天 scope |
| Vercel 只有 main 部署 | APPROVED / CONFIGURED | 避免 preview 額度浪費 |

---

## 9. 重要檔案地圖

```text
HANDOFF.md
vercel.json
package.json

src/
├─ App.vue                     # 手機 + host 主流程、Realtime 畫面切換
├─ domain/
│  ├─ domain.ts                # pure domain logic
│  ├─ domain.test.ts           # unit tests
│  ├─ questions.ts             # 題目、persona、score
│  └─ types.ts
└─ lib/
   ├─ supabase.ts              # Supabase browser client
   ├─ session-service.ts       # session / answer / lock / reveal / realtime
   └─ database.types.ts        # live Supabase schema types

supabase/
└─ migrations/
   ├─ 20260929_initial.sql
   ├─ 20260929_security_hardening.sql
   └─ 20260929_restrict_join_to_open.sql

openspec/
└─ changes/lunch-roulette-mvp/
   ├─ proposal.md
   ├─ design.md
   ├─ tasks.md
   └─ specs/
      ├─ live-session/spec.md
      ├─ preference-quiz/spec.md
      └─ result-reveal/spec.md

tests/
└─ db/rls-smoke.sql
```

---

## 10. Acceptance Metrics

| 驗收 | 結果 | 證據／下一步 |
|---|---|---|
| Supabase project healthy | PASS | 本次 live connector 查核 |
| Security Advisor 無安全警告 | PASS | 本次 live connector 查核：0 lints |
| DB 寫入基本資料流 | PASS（先前實測） | session / participant / response |
| participant response privacy | PASS（先前實測） | RLS role simulation |
| host response access | PASS（先前實測） | RLS role simulation |
| outsider isolation | PASS（先前實測） | RLS role simulation |
| locked 後 answer update 被拒 | PASS（先前實測） | 0 rows |
| locked 後 late join 被拒 | PASS（先前實測） | RLS 42501 |
| main-only Vercel config | PASS | `vercel.json` |
| npm install | NOT_RUN | 本機執行 |
| unit tests runtime | NOT_RUN | `npm run test:unit` |
| typecheck | NOT_RUN | `npm run typecheck` |
| build | NOT_RUN | `npm run build` |
| Anonymous Sign-ins | UNKNOWN | Supabase runtime / Dashboard |
| 8 人同時在線 | NOT_RUN | browser/mobile E2E |
| synchronized Reveal | NOT_RUN | browser/mobile E2E |
| Vercel Project | NOT_STARTED | live Vercel 目前無 lunch-roulette |
| Demo URL | BLOCKED | 先建立 Vercel Project + production deploy |

---

## 11. Workspace Provenance

| 快照 | Repo / Service | 版本／狀態 | 查核來源 |
|---|---|---|---|
| GitHub main | `sodahsu/lunch-roulette` | `13d326c728f541cb908d2ea312fb8307751209b8` | GitHub connector，本次 |
| Supabase | `lunch-roulette` | `ACTIVE_HEALTHY` / `hvaxoopyccwsqmhjnibg` | Supabase connector，本次 |
| Vercel | connected team | 目前只有 `beloved-agent` project | Vercel connector，本次 |
| Local workspace | 使用者本機 | UNKNOWN | 必須由本機 Codex 跑 `git status` |

---

## 12. 交付判定

**VERDICT: READY_FOR_HANDOFF**

- 文件已把「已驗證」、「先前驗證但本次未重跑」、「NOT_RUN」、「UNKNOWN」、「BLOCKED」分開。
- 本機 Codex 不需要猜目前主分支、Supabase 狀態、Vercel 狀態或下一步。
- 最優先不是繼續加功能，而是把 `npm install → unit → typecheck → build → runtime` 跑通。
- Demo URL 尚未存在，必須先建立 Vercel `lunch-roulette` Project。
- 建立 Vercel Project 後仍保留「只有 main 部署」這個既定要求。
- 此交接檔本身不代表未執行測試已通過。


## 13. 分支清理｜目標只保留 main

使用者已明確要求 repository 維持單一分支。

### 已查核可刪除的遠端分支

- `chore/vercel-main-only`：PR #3 已 squash merge 到 `main`。
- `feat/lunch-roulette-mvp`：PR #1 已 squash merge 到 `main`。
- `feat/reveal-sync-show`：PR #2 已 squash merge 到 `main`。
- `spec/openspec-lunch-roulette-mvp`：OpenSpec 內容已存在 `main`；proposal/design/config/preference spec 完全一致，live/result spec 在 `main` 有後續新增，tasks 舊分支所有項目也都可在 `main` 找到。

> 因為前面使用 squash merge，舊 branch 會在 Git 顯示 diverged；這不代表成果尚未進 main。本次已另外用 PR 與檔案內容查核。

### 本機 Codex 執行

先確認目前不是在任何待刪 branch／worktree：

```bash
git status
git worktree list
git switch main
git pull --ff-only
```

刪除遠端 4 個舊 branch：

```bash
git push origin --delete \
  chore/vercel-main-only \
  feat/lunch-roulette-mvp \
  feat/reveal-sync-show \
  spec/openspec-lunch-roulette-mvp
```

清掉本機 remote-tracking refs：

```bash
git fetch --prune
```

若本機也存在這 4 個 local branch，且 `git worktree list` 確認沒有 worktree 正在使用，再刪除：

```bash
git branch -D \
  chore/vercel-main-only \
  feat/lunch-roulette-mvp \
  feat/reveal-sync-show \
  spec/openspec-lunch-roulette-mvp
```

最後驗證：

```bash
git branch
git branch -r
git branch -a
```

預期 repository 分支只保留：

```text
main
origin/main
```

### 保護條件

- 不刪 `main`。
- 不對 `main` force push。
- 如果 `git worktree list` 顯示舊 branch 被 worktree 使用，先確認該 worktree 是否有未提交修改；不要直接移除 worktree。
- 遠端 branch 清完後，後續工作直接在 `main` 進行；不要再建立 feature/spec/chore branch，除非使用者之後明確改變這個規則。
