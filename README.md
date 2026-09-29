# lunch-roulette

多人即時飲食人格遊戲。

## Stack

- Vue 3 + Vite + TypeScript
- Supabase Auth / Postgres / Realtime
- Vitest
- Playwright

## Real data flow

1. 主持人建立場次，寫入 `sessions`
2. 參與者匿名登入後加入，寫入 `participants`
3. 答案寫入 `responses`
4. DB trigger 同步 `participants.completed_at`
5. 所有裝置透過 Supabase Realtime 更新場次狀態與完成進度
6. 主持人鎖定後建立：
   - `result_snapshots`：公開群體統計
   - `participant_results`：每位參與者自己的私人結果
7. Reveal 後重新整理仍讀取同一份資料，不會重新抽人格

## Supabase setup

1. 建立 Supabase project
2. 在 Authentication 啟用 Anonymous Sign-ins
3. 執行：
   `supabase/migrations/20260929_initial.sql`
4. 建立 `.env.local`

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

5. 安裝並啟動

```bash
npm install
npm run dev
```

## Verification

```bash
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
```

目前 migration 與前端資料層已準備好；實際雲端資料庫是否可用，以 Supabase project 套用 migration 後的驗證結果為準。
