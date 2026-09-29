---
title: "Lunch Roulette MVP｜本機 Codex 工作交接"
date: "2026-09-29"
handoff_status: ready_for_handoff
---

# Lunch Roulette MVP｜本機 Codex 工作交接

## Resume Here

**目標：**把 10/1 可玩的多人 Lunch Roulette MVP 驗證到可上場並部署 Demo。程式主要功能已補齊；現在優先做 runtime 驗證，不要再擴 scope。

**實作快照 HEAD（HANDOFF 更新前）：** `0032982147ab26e4cd6bb6bc9bcb58492c466a23`

### 本次已實作

- Host / participant 即時多人流程。
- `open → locked → revealed` 同步 Reveal。
- Reveal 前可修改，locked 後 DB 層拒絕修改。
- Reveal 後 participant 手機自動切 persona。
- 未完成 participant 不阻塞 Reveal，且揭曉後顯示「你沒有答完」，不硬判人格。
- Host QR Code 加入連結 + 複製連結。
- Host 匿名 aggregate 笑點卡：
  - 都可以自信值
  - 飲食內戰
  - 歷史性共識
- Persona 卡改用動物角色 emoji。
- v0.2 題目系統：
  - 24 題題庫
  - 6 類，每類 4 題
  - 新房間依房號 deterministic 抽 12 題，每類 2 題
  - `self-image` 每局必出
  - 同一房間 reload 不換題
  - 舊 v0.1 房間保留原 8 題
- Persona / matching：
  - 8 persona
  - option score 加總
  - 最高分 persona
  - `PERSONA_PRIORITY` tie-break
  - **不使用 threshold**
  - similarity = 雙方可比較題目的等權答案一致率
- Reveal 新增團體結果：
  - 「我們這團可以出去吃飯嗎？」
  - deterministic 飯局相容度 0–100
  - 主持人大螢幕與每支手機結果都會顯示
- Playwright CASE-01～08 **test code 已寫**：
  - 多人正常流程
  - 未滿 8 人 Reveal
  - Reveal 前修改採 latest response
  - 未完成者不阻塞
  - Lock 後不可改
  - Refresh 後結果一致
  - 公開畫面不洩漏逐題答案
  - 第 9 位可加入並作答
- Domain tests 新增：
  - 24 題題庫 / 6 類別 contract
  - v0.2 每房 deterministic 12 題
  - v0.1 legacy 8 題相容
  - 完整性、persona、similarity
  - 飯局相容度

### 本次沒有宣稱完成的項目

- `npm install`：NOT_RUN
- `npm run test:unit`：NOT_RUN
- `npm run typecheck`：NOT_RUN
- `npm run build`：NOT_RUN
- `npm run test:e2e`：NOT_RUN
- 真正 8/9 browser context 同時在線：NOT_RUN
- Anonymous Sign-ins provider 是否已 Enable：UNKNOWN
- Vercel `lunch-roulette` Project / Demo URL：尚不存在
- `package-lock.json`：尚不存在；本次嘗試由 npm registry 產生時連線逾時
- 遠端舊 branch 清理：尚未完成

```yaml
handoff_purpose: implementation_verification_and_deploy
task_state: implementation_written_runtime_not_verified
code_changed: true
repository_reverified: true
approval_evidence:
  - "使用者要求直接實作"
  - "使用者要求只保留 main"
  - "使用者要求只有 main 觸發部署"
```

---

## FACT / UNKNOWN

### FACT｜GitHub main

- Repo：`sodahsu/lunch-roulette`
- Branch：`main`
- 實作快照 HEAD：`0032982147ab26e4cd6bb6bc9bcb58492c466a23`（後續只有 HANDOFF 文件更新）
- 本次實作全部直接寫入 main，沒有另外開 feature branch。
- `vercel.json` 已設定只有 `main` 允許 deployment。

### FACT｜Supabase

- Project：`lunch-roulette`
- Ref：`hvaxoopyccwsqmhjnibg`
- Region：`ap-northeast-1`
- 前次 live 狀態：`ACTIVE_HEALTHY`
- Security Advisor 前次查核：0 lints
- Auth schema 前次查核：
  - `auth.users` rows = 0
  - `auth.sessions` rows = 0
- 本次另查 public sessions：目前有 1 個舊 `v0.1` open session，因此新版保留 v0.1 原 8 題相容路徑。
- 新建立 session 會明確寫入 `questionnaire_version = 'v0.2'`。
- 以上仍不能證明 Anonymous Sign-ins 已開或沒開。

### FACT｜Vercel

本次 live 查核目前只有 Vercel project：

- `beloved-agent`

**沒有 `lunch-roulette` Project，所以目前沒有 Demo URL。**

### FACT｜Final static diff review

題庫擴充這輪從 HEAD `5b6f36faaffce3049f4090183dad3cc34282018f` 比到目前 main，變更只落在：

- OpenSpec
- `package.json`
- `src/App.vue`
- `src/styles.css`
- `src/domain/questions.ts`
- `src/domain/domain.test.ts`
- `tests/e2e/lunch-roulette.spec.ts`

**沒有改 DB migration / RLS / schema。**

---

## Stable Architecture／不要破壞

| 約束 | 狀態 |
|---|---|
| `sessions.status` 是流程時序單一真相源 | 保留 |
| Reveal 前可反覆修改 latest response | 保留 |
| locked 後 DB 層拒絕 response update | 保留 |
| 未完成 participant 不阻塞 Reveal | 保留 |
| 公開 host 畫面只顯示 aggregate | 保留 |
| participant 只讀自己的私人 persona result | 保留 |
| Reveal 後讀 persisted result，不重新抽人格 | 保留 |
| 核心 persona / similarity deterministic | 保留 |
| 8 人是主要規模，不是 hard limit | 保留 |
| Vercel 只有 main 部署 | 保留 |
| 不新增餐廳 API / 地圖 /會員系統 | MVP 非目標 |

---

## 重要檔案

```text
src/App.vue
src/styles.css
src/domain/questions.ts
src/domain/domain.ts
src/domain/domain.test.ts
src/lib/session-service.ts
tests/e2e/lunch-roulette.spec.ts
playwright.config.ts
package.json
vercel.json
openspec/changes/lunch-roulette-mvp/
```

---

## 本機 Codex 下一步

### 1. 先確認本機狀態

```bash
git status
git worktree list
git switch main
git pull --ff-only
```

不要 reset / clean / stash 來源不明的修改。

### 2. 安裝並產生 lockfile

```bash
npm install
```

預期產生 `package-lock.json`。確認 package 版本沒有被意外漂移後，再提交 lockfile。

### 3. 依序跑驗證

```bash
npm run test:unit
npm run typecheck
npm run build
npm run test:e2e
```

若失敗：

1. 保留第一個有意義 error。
2. 做最小修正。
3. 重跑該項。
4. 通過後才跑下一項。

### 4. Anonymous Auth

前端使用：

```ts
supabase.auth.signInAnonymously()
```

如果開房第一步失敗，確認：

**Supabase Dashboard → Authentication → Providers → Anonymous → Enable**

不要為了繞過 Auth 去放寬 RLS。

### 5. E2E 驗證重點

Playwright 已有 `tests/e2e/lunch-roulette.spec.ts`，CASE-01～08 都寫好了，但目前全部 **NOT_RUN**。

特別確認：

- QR 掃碼後進入正確房間
- 3 人可 Reveal
- 8 人正常
- 第 9 人可加入
- 未完成者不阻塞
- locked 後手機不能再改答案
- participant Reveal 後自動翻人格
- refresh 後 persona 不變
- host aggregate 不出現「某人選了哪個答案」

### 6. Vercel Demo

目前沒有 `lunch-roulette` Project。

第一次部署時建立：

- Repo：`sodahsu/lunch-roulette`
- Framework：Vite
- Build：`npm run build`
- Output：`dist`
- Production branch：`main`
- env：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

不要放 service role / secret key 到前端。

---

## 舊 branch 清理

使用者要求只留單一 branch，但目前 GitHub 仍有：

- `chore/vercel-main-only`
- `feat/lunch-roulette-mvp`
- `feat/reveal-sync-show`
- `spec/openspec-lunch-roulette-mvp`

這 4 支已查核可刪，內容都已進 main。

本機確認 worktree 沒使用後：

```bash
git push origin --delete \
  chore/vercel-main-only \
  feat/lunch-roulette-mvp \
  feat/reveal-sync-show \
  spec/openspec-lunch-roulette-mvp

git fetch --prune
```

最後預期只剩：

```text
main
origin/main
```

---

## Acceptance

| 驗收 | 狀態 |
|---|---|
| 核心多人流程程式 | IMPLEMENTED |
| 24 題題庫 / 12 題房間題組 | IMPLEMENTED / NOT_RUN |
| 團體「可以出去吃飯嗎」相容度 | IMPLEMENTED / NOT_RUN |
| QR 加入 | IMPLEMENTED / NOT_RUN |
| Host aggregate 笑點卡 | IMPLEMENTED / NOT_RUN |
| 動物 persona card | IMPLEMENTED / NOT_RUN |
| CASE-01～08 test code | IMPLEMENTED |
| Domain test code | IMPLEMENTED |
| DB / RLS 前次 smoke | PASS（先前實測） |
| npm install | NOT_RUN |
| unit | NOT_RUN |
| typecheck | NOT_RUN |
| build | NOT_RUN |
| e2e | NOT_RUN |
| Anonymous Sign-ins | UNKNOWN |
| package-lock | MISSING |
| Vercel Project | NOT_STARTED |
| Demo URL | BLOCKED |
| OpenSpec archive readiness | BLOCKED：runtime validation 尚未通過 |

## VERDICT

**READY_FOR_HANDOFF**

接手者現在不需要再補核心功能；第一優先是 **install → unit → typecheck → build → e2e → Anonymous Auth → Vercel Demo**。特別驗證 v0.2 同房 12 題一致、v0.1 legacy 8 題不被改掉，以及團體飯局 verdict 在 host/手機都正確顯示。

在這些 runtime checks 實際 PASS 前，不要宣稱「正式可上場」。
