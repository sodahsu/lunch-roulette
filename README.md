# 都可以？ / lunch-roulette

多人即時飯局人格社交遊戲。

> 8 個人都說自己很好約。最後看看這團今晚到底有多大機會真的約成一頓飯，以及誰才是真的「都可以」。

## Experience

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

Playwright 目前包含 CASE-01～16，涵蓋：

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

Active OpenSpec change：

`openspec/changes/lunch-roulette-mvp/`

主要 capability：

- `live-session`
- `preference-quiz`
- `result-reveal`
- `food-consensus`

在 runtime validation 與 success-rate cross-version persistence 決策完成前，change 保持 active，不應宣稱已 archive。
