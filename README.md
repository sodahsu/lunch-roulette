# 都可以？ / lunch-roulette

多人即時飯局人格社交遊戲。

> 8 個人都說自己很好約。最後看看這團今晚到底有多大機會真的約成一頓飯，以及誰才是真的「都可以」。

## Experience

目前正式流程：

```text
Host 開房 / QR 加入
→ 每人回答本局 deterministic 12 題
→ Host 鎖定
→ 大螢幕先公布「今晚約成飯的成功率」
→ session 仍 locked、手機繼續 waiting
→ Host 按「公開處刑 🎴」
→ 手機同步翻 Persona collectible card
→ 靈魂飯友 / 飲食天敵
→ 結果頁列出大家都能吃的餐點
```

### Solo-start

`task/solo-start` 目前規格方向是「1 個人就能先開局，朋友之後再加入」，不是另外做一套 Solo mode：

```text
建立飯局
→ Host 選「我先玩」
→ Host 同時成為第一位 participant
→ 完成本局 12 題 + 忌口
→ 看到自己的 provisional Persona
→ 房間仍保持 open，QR / 房號繼續可分享
→ 朋友加入時不重置既有答案或進度
→ 2 位以上 complete participant 後，Host Control Room 顯示 provisional group preview
→ 有效樣本改變時即時重算目前局勢
→ Host 最後鎖定
→ 沿用既有兩段式正式 Reveal
```

Solo-start 的 provisional result 不會寫入正式 `result_snapshots` / `participant_results`；正式結果仍以 `locked` 當下的 complete responses 重新建立。每位 participant 只在自己的裝置看到 provisional Persona；群體 provisional 成功率與 food consensus 只在 Host Control Room 聚合顯示，不放寬 participant 讀取他人 responses 的 RLS。只有 1 位 complete participant 時，不顯示團體成功率百分比，也不產生 soulmate / opposite。

新場次使用問卷 v0.3：題庫共有 48 題、6 類，每類 8 題；每個房間依房號固定選 12 題，每類 2 題，`self-image` 固定入選。進行中的 v0.2 房間沿用 v0.2 的 24 題題庫（6 類，每類 4 題，每房同樣抽 12 題）與原本的配分，舊 v0.1 房間保留原 8 題。完成答題後另有獨立的忌口步驟；結果只保存各類排除計數，不影響 Persona、配對或成功率。

## Visual direction

**Dark Editorial × Food Personality × Social Experiment**

- 黑色設計展感
- Electric Blue / Acid Lime / Alert Red
- Host Control Room
- A / B 大型選項
- 第 4 / 8 / 11 題 full-screen pacing interstitial
- Success Rate 巨型 typography
- 10 種 Persona runtime asset（圖片缺失時退回 inline SVG）
- Collectible Persona Card

Runtime Persona 圖形位於：

`src/assets/personas/`（缺圖時退回 `src/components/PersonaGlyph.vue`）

## Stack

- Vue 3 + Vite + TypeScript
- Supabase Anonymous Auth / Postgres / Realtime
- Vitest
- Playwright

## Real data flow

目前已實作：

1. Host 建立 `sessions`
2. Participant 透過 Anonymous Auth 取得 user identity
3. 加入房間寫入 `participants`
4. Latest answers upsert 至 `responses`
5. DB trigger 同步 `participants.completed_at`
6. Supabase Realtime 同步 session / participant / result 狀態
7. Host Reveal Stage A：
   - `open → locked`
   - locked responses 計算 group preview
   - 只顯示 Dinner Success Rate
   - 不提前產生 Persona
8. Host Reveal Stage B：
   - 「公開處刑 🎴」
   - persist `result_snapshots`
   - persist `participant_results`
   - `locked → revealed`
9. Participant 手機自動載入固定 Persona / pairing result
10. Revealed 後，Host 可用 `/?room=<ROOM_CODE>&view=overview` 查看同房 complete participants 的 Persona 總覽；participant 仍只能讀自己的 result

## Supabase

Project ref：

`hvaxoopyccwsqmhjnibg`

Frontend 使用 publishable key；**不可把 service-role / secret key 放進 frontend**。

啟用本專案前需確認：

1. Authentication → Anonymous Sign-ins 已 Enable
2. Live schema / RLS 已套用
3. Realtime 可正常收到 sessions / participants / responses / result tables 變更

目前程式使用：

`supabase.auth.signInAnonymously()`

## Local setup

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

如要覆寫預設 Supabase project，可建立 `.env.local`：

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

## Verification

```bash
pnpm test:unit
pnpm typecheck
pnpm build
pnpm test:e2e
```

Playwright 目前包含 CASE-01～26；CASE-19～23 涵蓋 Solo-start 與隱私，CASE-24～26 涵蓋人格卡／團體成功率卡下載與連結預覽。實際驗證結果以執行紀錄與 CI 為準。涵蓋：

- 兩段式 Reveal
- 未完成者
- latest response
- locked 後不可改
- refresh result consistency
- public privacy
- 第 9 位 participant
- pacing interstitial
- collectible Persona card 與 10 種 Persona
- 房號不存在與 URL 清理
- 結束後重新開局
- 稀有卡與每場保底
- food consensus 示意流程
- Host 10 人結果總覽與 responsive layout
- 音效切換與靜音偏好持久化
- Solo-start：Host 單人開局、late join provisional preview、Host-as-participant final Reveal

> Test code 已存在不代表 runtime 已 PASS。請以實際命令輸出為準。

## Branch strategy

開發整合以 `dev` 為優先，`main` 只代表可發布的 production 基準：

```text
task/* / feat/*
      ↓
     dev
      ↓
整合驗證（unit / typecheck / build / E2E / runtime / RLS）
      ↓
PR: dev → main
      ↓
merge main
      ↓
Vercel Production
```

規則：

- 功能分支不得直接以 `main` 為日常整合目標。
- `task/*` / `feat/*` 先 merge 到 `dev`。
- `dev` 不觸發 Vercel deployment。
- PR / feature branch 不產生 Vercel Preview。
- 只有 merge / push 到 `main` 才允許 Vercel Production deployment。
- Release / tag 只在 `dev → main` 的 production gate 通過後處理。
- `.github/workflows/branch-policy.yml` 會拒絕非 `dev` 來源直接 PR 到 `main`，避免 GitHub default branch 仍為 `main` 時誤送 production。

## Deployment

`vercel.json` 只允許 `main` 進行 Git deployment；`dev`、PR 與所有 feature/task branch 都不部署：

```json
{
  "ignoreCommand": "[ -n \"$VERCEL_GIT_COMMIT_REF\" ] && [ \"$VERCEL_GIT_COMMIT_REF\" != \"main\" ]",
  "git": {
    "deploymentEnabled": {
      "*": false,
      "**": false,
      "main": true
    }
  }
}
```

兩層並用：`deploymentEnabled` 用 minimatch 語法，`*` 不跨 `/`，所以改用 `**` 才擋得到 `sodahsu/xxx`、`docs/17-xxx` 這類含斜線的分支；`ignoreCommand` 是備援，非 `main` 時 exit 0（略過建置），`main` 時 exit 1（繼續建置）；取不到 `VERCEL_GIT_COMMIT_REF`（空或未設定）時也 exit 1 繼續建置，避免把 `main` 的 production 一併略過，這時非 `main` 由 `deploymentEnabled` 擋下。`src/config/vercel-config.test.ts` 會斷言這個政策。

Vite build output：`dist`。

### 暫不開放搜尋收錄

網站維持公開、不需登入，但目前內容還不完整，所以暫時請搜尋引擎不要索引，避免不完整的版本被收錄。完整後再撤回。

兩處設定（雙保險，第二處涵蓋非 Vercel 的託管情境）：

- `vercel.json` 的 `headers`：對所有路徑回 `X-Robots-Tag: noindex, nofollow`。
- `index.html` `<head>` 的 `<meta name="robots" content="noindex, nofollow">`。

不要用 `robots.txt` 的 `Disallow: /`：被擋住的爬蟲讀不到 `noindex`，已收錄的頁面反而不會被移除。目前沒有 `public/robots.txt`；若日後新增，只能允許爬取（`User-agent: *` + `Allow: /`）。這項設定只影響搜尋引擎索引，不加登入保護，網站照常公開使用。

撤回方式：

1. 刪掉 `vercel.json` 的 `headers` 區塊。
2. 刪掉 `index.html` 的 `<meta name="robots" ...>` 與上方註解。
3. 刪除 `src/config/noindex.test.ts`（它斷言 noindex 存在，不刪會失敗），再跑 `pnpm test:unit`、`pnpm build` 確認其餘測試通過。
4. 合併到 `main` 並待 Production 部署完成後，用 `curl -I <網址>` 確認已沒有 `X-Robots-Tag`。已被標記 noindex 的頁面要等搜尋引擎重新爬取才會重新收錄。

## Specs

現行已驗證規格：

- `openspec/specs/`
- `openspec/changes/archive/2026-10-01-lunch-roulette-mvp/`

目前 active change：

- `openspec/changes/solo-start/`
  - `proposal.md`
  - `design.md`
  - `tasks.md`
  - `specs/live-session/spec.md`
  - `specs/result-reveal/spec.md`
  - `specs/food-consensus/spec.md`

主要 capability：

- `live-session`
- `preference-quiz`
- `result-reveal`
- `food-consensus`

`solo-start` 目前狀態為 **VALIDATED ON DEV / ARCHIVE & RELEASE PENDING**。2026-10-03 已修正 CASE-01 timeout 的根因（open 預覽蓋掉主持人的鎖定按鈕），unit / typecheck / build / OpenSpec strict / full E2E（CASE-01～21）在 CI 通過，1 → 2 → 3 人 runtime smoke、locked / revealed late join 與 privacy / RLS smoke 也已通過。archive review 與 release 版本號核准完成前，不會把 Solo-start 併入 `openspec/specs/`。

詳細測試追溯與完成 gate：`docs/solo-start-test-plan.md`。


## Release versioning

App Release 使用 Semantic Versioning，與資料欄位 `questionnaire_version` 分開管理：

- `package.json#version` / Git tag / GitHub Release：代表整個 Web App 的發布版本。
- `questionnaire_version`：只代表題組與對應 domain algorithm contract，不等於 App Release。

Solo-start 預定版本：

- `v0.2.0-rc.1`：功能實作完成並進入完整驗證時的 release candidate。
- `v0.2.0`：相關 unit / typecheck / build / E2E / runtime smoke 全部通過，先整合 `dev`，再由 `dev → main` 合併後建立正式 Release。

正式 Release 不從未驗證的 feature branch 建立。若 RC 驗證失敗，修正後依序使用 `v0.2.0-rc.2`、`v0.2.0-rc.3`，直到符合 release gate。
