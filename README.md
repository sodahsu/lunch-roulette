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

### Planned: Solo-start（規格完成、尚未實作）

`task/solo-start` 目前規格方向是「1 個人就能先開局，朋友之後再加入」，不是另外做一套 Solo mode：

```text
建立飯局
→ Host 選「我先玩」
→ Host 同時成為第一位 participant
→ 完成本局 12 題 + 忌口
→ 看到自己的 provisional Persona
→ 房間仍保持 open，QR / 房號繼續可分享
→ 朋友加入時不重置既有答案或進度
→ 2 位以上 complete participant 後顯示 provisional group preview
→ 有效樣本改變時即時重算目前局勢
→ Host 最後鎖定
→ 沿用既有兩段式正式 Reveal
```

Solo-start 的 provisional result 不會寫入正式 `result_snapshots` / `participant_results`；正式結果仍以 `locked` 當下的 complete responses 重新建立。只有 1 位 complete participant 時，不顯示團體成功率百分比，也不產生 soulmate / opposite。

v0.2 題庫共有 24 題、6 類；每個房間依房號固定選 12 題，每類 2 題。舊 v0.1 房間保留原 8 題。完成答題後另有獨立的忌口步驟；結果只保存各類排除計數，不影響 Persona、配對或成功率。

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

Playwright 目前包含 CASE-01～18（CASE-17 / 18 已加入），涵蓋：

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

> Test code 已存在不代表 runtime 已 PASS。請以實際命令輸出為準。

## Deployment

`vercel.json` 只允許 `main` 進行 Git deployment：

```json
{
  "git": {
    "deploymentEnabled": {
      "*": false,
      "main": true
    }
  }
}
```

Vite build output：`dist`。

## Specs

現行已驗證規格：

- `openspec/specs/`
- `openspec/changes/archive/2026-10-01-lunch-roulette-mvp/`

目前待實作 change：

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

`solo-start` 目前狀態為 **SPEC READY / IMPLEMENTATION NOT STARTED**。在功能實作與 unit / typecheck / build / E2E / runtime 驗證完成前，不會把 Solo-start 行為併入 `openspec/specs/` 當作已驗證現行規格。


## Release versioning

App Release 使用 Semantic Versioning，與資料欄位 `questionnaire_version` 分開管理：

- `package.json#version` / Git tag / GitHub Release：代表整個 Web App 的發布版本。
- `questionnaire_version`：只代表題組與對應 domain algorithm contract，不等於 App Release。

Solo-start 預定版本：

- `v0.2.0-rc.1`：功能實作完成並進入完整驗證時的 release candidate。
- `v0.2.0`：相關 unit / typecheck / build / E2E / runtime smoke 全部通過、合併 `main` 後的正式 Release。

正式 Release 不從未驗證的 feature branch 建立。若 RC 驗證失敗，修正後依序使用 `v0.2.0-rc.2`、`v0.2.0-rc.3`，直到符合 release gate。
