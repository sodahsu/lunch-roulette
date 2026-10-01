---
title: "《都可以？》預上線檢查計畫"
date: "2026-10-01"
baseline_commit: "bab2aa5"
baseline_parent_code: "ac9206d"
baseline_test: "92dd835"
status: "ready_for_execution"
---

# 《都可以？》預上線檢查計畫

**目的：** 確認 lunch-roulette 的核心遊戲、多人同步、UI/UX、測試與部署已準備好上線。

**範圍：** Backend（Auth、RLS、Realtime）→ UI（手機與 Host 流程）→ Tests（單元、類型檢查、構建、E2E）→ 環境與部署驗證。

**基準代碼：**
- Core code：`ac9206d`（移除 obsolete food-consensus fallback）
- Test baseline：`92dd835`（food-consensus contract 驗證）
- Current：`bab2aa5`（Vercel deployment evidence）

---

## 階段 1：Backend 與 Infrastructure（Day 1 / Priority 1）

### 1.1 Authentication & Authorization

**狀態：** Supabase project 已確認 ACTIVE_HEALTHY；Anonymous Sign-ins **未 runtime 驗證**。

**驗證命令：**

```bash
# Local setup
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

**手動驗證清單：**

- [ ] `localhost:5173` 開啟無誤
- [ ] 點「加入飯局」→ 掃碼／房號
- [ ] Supabase dashboard 確認 `auth.users` 出現新 anonymous user
- [ ] 使用者 session 不暴露 service-role secret（檢查瀏覽器 Network tab）
- [ ] 刷新頁面後 session 仍保持（前端 `persistSession: true` 運作）
- [ ] 同一房號多個客戶端各自取得獨立 user_id

**核心合約：**

```typescript
// src/lib/supabase.ts
const supabase = createClient<Database>(url, publishable_key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
```

**禁止改動：**
- 不使用 `service_role` secret 在前端
- 不在 localStorage 顯式儲存 user credentials

---

### 1.2 Row-Level Security (RLS) 與多人同步

**狀態：** RLS 已套用（HANDOFF verified）；`participants.completed_at` trigger 已實作；Host revealed overview 有 participant privacy policy。

**驗證清單：**

- [ ] Supabase dashboard → "RLS enabled" 綠燈
- [ ] 檢查四張表的 policy：
  - `sessions` - 任何人可 read（public 遊戲）；Host 可 update
  - `participants` - read own + Host overview；write own 答案
  - `responses` - read own；write own 最新答案
  - `result_snapshots` - read own group；不可 write
  - `participant_results` - read own；不可 write

**驗證命令：**

```bash
# 在 Supabase SQL editor 確認 RLS 在線
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**核心合約：**

1. Participant 只能讀自己的 responses 與自己的 result
2. Host 可讀 revealed-only 的 participant result 列表（不含個人答案）
3. 鎖定後（locked）任何人禁止修改 responses

**驗證方式：**

```typescript
// src/lib/session-service.ts 中的查詢需驗證 RLS filter 被應用
// E2E test CASE-01 / CASE-05 會驗證 locked 後 participant 不可改答案
```

---

### 1.3 Realtime 同步驗證

**狀態：** Realtime 訂閱已實作；三張表（sessions、participants、responses）需實時同步。

**驗證清單：**

- [ ] 開發模式下打開兩個瀏覽器窗口（Host + Participant）
- [ ] Participant 答題 → Host 看到即時更新計數（JOINED / COMPLETED）
- [ ] Host 鎖定 → Participant 頁面立即變「等待」（CASE-01 驗證）
- [ ] Host 揭曉成功率 → 大螢幕出現，手機仍待 locked（不會提前出現 Persona）
- [ ] Host 按「公開處刑 🎴」→ 手機同步翻 Persona card（延遲 < 1 秒）
- [ ] 刷新頁面後狀態一致（重新訂閱 channel 後回到當前 session status）

**核心合約：**

```typescript
// src/lib/session-service.ts
subscribeToSession(sessionId, (updated) => {
  // status: 'open' | 'locked' | 'revealed'
  // participants 實時陣列
  // 手機需依 status 改變 UI
})
```

**不可改動：**
- session 狀態轉換必須保持 `open → locked → revealed` 的單向性
- locked 時 participant 頁應立即改成 waiting（不是 delayed）

---

## 階段 2：Frontend UI 驗證（Day 1～2 / Priority 1）

### 2.1 Participant Flow（手機視角）

**場景：** Participant 掃 QR 或輸入房號，加入遊戲，回答題目，等待揭曉，收到結果。

**驗證命令：**

```bash
pnpm dev
# 在 375px mobile viewport（DevTools mobile emulation）開啟
```

**驗證流程：**

| 步驟 | 預期行為 | 驗收標準 |
|------|---------|---------|
| 1. 掃 QR / 輸入房號 | 進入「先報上名來」 | 暱稱欄位可聚焦、「加入這一局」可點選 |
| 2. 輸入暱稱 + 加入 | 進入第 1 題（可見「第 1/12 題」） | 問題文本清晰、兩個選項（A/B）各佔屏幕寬度 >40% |
| 3. 作答 1～3 題 | 每題點選後進下一題，題號更新 | 選中項高亮（Electric Blue invert），切換順暢 |
| 4. 第 4 題時 | 作答後出現 1.8 秒 full-screen interstitial（「MINORITY DETECTED」） | 文案清晰可讀（投影 2 米遠仍看得懂） |
| 5. 完成 12 題 | 進入忌口步驟 | 可勾選「火鍋」等 3～5 項 |
| 6. 交卷 | 進入 waiting 頁（「你答完了。先不要偷看別人。」） | 倒數計時或完成比例顯示 |
| 7. Host 鎖定 | 頁面立即變「等待揭曉」（不是留在 waiting） | 轉換 < 500ms |
| 8. Host 揭曉成功率 | 頁面進入 locked result 頁，顯示成功率與 verdict（不顯示 Persona） | Persona card 仍不可見 |
| 9. Host 公開處刑 🎴 | 頁面自動翻 Persona card（Realtime + trigger） | Persona 在 2 秒內出現、不需要再按任何按鈕 |
| 10. 查看結果 | 可看靈魂飯友（similarity 最高）與飲食天敵（最低） | 清單按 similarity 排序 |

**手機視覺驗收（Dark Editorial）：**

- [ ] 背景 `#0B0B0C`（深色）
- [ ] 文字 `#F5F5F2`（米白）
- [ ] 選中項 Electric Blue `#4C6FFF` + invert（全屏反差）
- [ ] Persona card 175px（最小）～ 300px（最大）仍可讀
- [ ] 沒有巨大 🍜 emoji（移除）

---

### 2.2 Host Flow（大螢幕視角）

**場景：** Host 開房 → 看房號 / QR → 鎖定 → 成功率三拍 → 揭曉 Persona 總覽 → 引導尋找飯友。

**驗證命令：**

```bash
pnpm dev
# 在 1920x1080 / 1280x720 viewport 開啟（模擬投影）
```

**驗證流程：**

| 步驟 | 預期行為 | 驗收標準 |
|------|---------|---------|
| 1. 開房 | 進入 Host Lobby | QR code 可掃、房號 >120px 字高 |
| 2. Participant 加入 | Lobby 實時更新「已加入 N 人」 | 計數無延遲（< 500ms） |
| 3. Participant 完成 | Lobby 更新「已完成 M 人」 | 進度條 / 文案無誤 |
| 4. 至少 1 人完成 | 「鎖定並揭曉」按鈕啟用 | disabled 屬性移除 |
| 5. Host 點擊鎖定 | 進入成功率三拍 | 第 1 拍：「7/8 人自認超好約」 |
| 6. 三拍順序 | 自認好約 → 答案誠實 → 實際成功率 | 每拍 3～4 秒，自動轉換（不需按鈕） |
| 7. 成功率顯示 | 顯示 `78%` + Verdict（「約得成…」） | 字體 72px+，顏色對比 WCAG AA |
| 8. 此時 session status | 仍是 `locked`（不是 `revealed`） | 檢查 DevTools console 或 Supabase UI |
| 9. Host 點公開處刑 🎴 | 進入 Host 總覽頁 | 看得到所有完成者的 Persona card（grid 或 row） |
| 10. 總覽頁 responsive | 在 375px / 768px / 1920px 都能讀 | 卡片在小屏不重疊、大屏不拉得太寬 |
| 11. 引導文案 | 「全部把手機舉起來…」 | 文案居中、明確 |

**Host 視覺驗收（Dark Editorial Control Room）：**

- [ ] QR code 周圍有足夠空白（易掃）
- [ ] 房號 font-size 不低於 120px
- [ ] 成功率數字 font-size 不低於 72px
- [ ] Persona card grid 在 1920px 寬時顯示 3～5 張 / row（不擁擠）
- [ ] 「公開處刑」按鈕醒目（Alert Red `#FF493D`）

---

### 2.3 Persona Card 與 Collectible Identity 驗收

**狀態：** 10 個 Persona 已實作；优先使用 `src/assets/personas/*.webp`，缺圖時用 `PersonaGlyph.vue` (inline SVG fallback)。

**驗證清單：**

- [ ] 10 個 Persona 動物可識別（🐻‍❄️ 🐺 🐈 🐧 🦉 🦥 🐯 🐰 🦊 🐼）
- [ ] 人格卡顯示：
  - TYPE 號（01～10）
  - 動物名稱（英）
  - 人格標籤（中）
  - 靈魂飯友 / 飲食天敵
- [ ] SVG fallback 在缺圖時自動啟用（不顯示破圖）
- [ ] 手機 375px 縮到最小時，動物輪廓仍可辨識（≥ 100px）
- [ ] 沒有兒童卡通感（geometry animal，not chibi）

**關鍵檢查：**

```bash
# 檢查 webp 是否存在
ls -la src/assets/personas/
# 預期 *.webp 數量 ≥ 10；若缺檔，SVG fallback 會觸發
```

---

## 階段 3：自動化測試驗收（Day 1～2 / Priority 1）

### 3.1 Unit Tests

**驗證命令：**

```bash
pnpm test:unit
```

**預期結果：** 33 項通過（2026-09-30 baseline）

**涵蓋項目：**

- Domain scoring（Persona 加總）
- Dinner Success Rate 公式（平均 question agreement）
- Similarity 計算（相同答案比例）
- Rare card 判定（3% 機率 + 每場保底）
- Questionnaire selection（v0.1 vs v0.2）

**核心驗收：**

```typescript
// src/domain/domain.test.ts
// 確認以下不變：
- 10 種 Persona deterministic
- highest score wins（tie 使用固定優先級）
- 不使用 threshold
- Similarity = 完全相同答案的 % 比例
- Rare card 3% chance + 1 free per session
```

---

### 3.2 Type Checking

**驗證命令：**

```bash
pnpm typecheck
```

**預期結果：** 0 errors

**涵蓋項目：**

- TypeScript strict mode
- Supabase generated types (`src/lib/database.types.ts`)
- Vue 3 component typing
- Reactive state typing

---

### 3.3 Build

**驗證命令：**

```bash
pnpm build
```

**預期結果：** `dist/` 資料夾生成，無 errors

**驗收標準：**

- [ ] `dist/index.html` 存在
- [ ] `dist/assets/` 包含 `.js` / `.css` / `.webp`（Persona 圖片）
- [ ] No breaking warnings in console
- [ ] Build output < 500KB（gzip；包含 Supabase client）

**關鍵檢查：**

```bash
# 檢查輸出
ls -lh dist/
# 驗證 sourcemap 未包含 secrets
grep -r "VITE_SUPABASE_URL\|VITE_SUPABASE_KEY" dist/
# 應該無匹配（keys 已編譯進去，不暴露）
```

---

### 3.4 E2E Tests（Playwright）

**驗證命令：**

```bash
pnpm test:e2e
```

**已實作 CASE 清單：**

- [x] **CASE-01**：Host lock → 成功率先出 → Participants 仍 waiting → Persona 不存在 → Host 公開處刑 → 手機同步 Persona
- [x] **CASE-02**：Participant refresh 後狀態不變
- [x] **CASE-03**：Locked 後不可改答案
- [x] **CASE-04**：Latest response upsert 邏輯
- [x] **CASE-05**：第 9 人仍可加入
- [x] **CASE-06～10**：Persona 與 similarity 配對
- [x] **CASE-11**：房號不存在時顯示錯誤頁
- [x] **CASE-12**：重新開局
- [x] **CASE-13**：Rare card 與稀有卡保底
- [x] **CASE-14**：Food consensus 示意流程
- [x] **CASE-15**：Host 10 人結果總覽 responsive
- [x] **CASE-16**：音效切換與靜音持久化
- [x] **CASE-17** *(New)*：Host overview responsive layout
- [x] **CASE-18** *(New)*：Audio preference persistence

**預期結果：** 18 項全通過

**關鍵驗證：**

- [ ] CASE-01：兩段式 Reveal 順序正確（Stage A locked → Stage B revealed）
- [ ] CASE-03：locked 後 participant 修改答案會被拒（RLS 驗證）
- [ ] CASE-13：同一 session 中第 10+ 人遇到 rare card 機率 < 5%
- [ ] CASE-17 / 18：最新 HEAD CASE 需重跑確認通過

**重跑命令（確認最新 HEAD）：**

```bash
# 在 D:\github\lunch-roulette
pnpm test:e2e --reporter=html
# 結果開啟 playwright-report/index.html
```

---

## 階段 4：環境與部署驗證（Day 2 / Priority 2）

### 4.1 Supabase 環境檢查

**Supabase Project Ref：** `hvaxoopyccwsqmhjnibg`

**驗證清單：**

```bash
# CLI 方式（需 supabase CLI）
supabase projects list
supabase status --project-ref hvaxoopyccwsqmhjnibg
```

或到 Supabase Dashboard → Project Settings：

- [ ] Project Status = **ACTIVE**
- [ ] Database = **healthy**
- [ ] Auth = **enabled**
  - [ ] Anonymous Sign-ins 已 **Enable**
  - [ ] No suspended users
- [ ] API = **online**
- [ ] Realtime = **enabled** 
  - [ ] `sessions`, `participants`, `responses` 表已配置 Realtime
- [ ] Security Advisor = review（預期警告：Anonymous Sign-ins + leaked-password-protection；已知，非 blocker）

**Frontend 環境變數：**

```env
# .env (public，已安全)
VITE_SUPABASE_URL=https://hvaxoopyccwsqmhjnibg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TTIx4ujs2WkdRzl6_y6zrA_BJN8PhaI
```

**禁止事項：**
- ❌ 不在 `.env` 或前端代碼中放 `service_role` secret key
- ❌ 不提交 `.env.local` 含真實 secret

---

### 4.2 Vercel 部署設定

**狀態：** `vercel.json` 已設定；Vercel project 尚未建立連接。

**當前 vercel.json：**

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

**上線前需完成：**

1. **Vercel Project Import**
   - [ ] 到 [vercel.com](https://vercel.com) → 匯入倉庫 `sodahsu/lunch-roulette`
   - [ ] Framework：**Vite**
   - [ ] Build command：`pnpm build`
   - [ ] Output directory：`dist`
   - [ ] Install command：`corepack enable && pnpm install --frozen-lockfile`

2. **Environment Variables**
   - [ ] 設定 `VITE_SUPABASE_URL`
   - [ ] 設定 `VITE_SUPABASE_PUBLISHABLE_KEY`
   - [ ] 驗證 dashboard 不洩露 values

3. **Production Deployment**
   - [ ] 推送 `main` → GitHub
   - [ ] Vercel 自動偵測並部署
   - [ ] 等待 status ✅

4. **Post-Deploy 驗收**

   ```bash
   # 替換 <YOUR_VERCEL_URL>
   curl -I https://<lunch-roulette>.vercel.app
   # 預期 200 OK
   ```

   - [ ] 首頁載入（不是 404）
   - [ ] QR code 可顯示（不缺資源）
   - [ ] 開啟 DevTools Network → 確認 supabase API 連線（無 CORS error）
   - [ ] 在真實手機開啟，掃 QR code 進房間
   - [ ] Realtime 同步無延遲

---

### 4.3 Production Smoke Test

**驗證命令（手動）：**

1. **Host 開房**
   ```
   https://<lunch-roulette>.vercel.app
   → 我是主持人，開新局
   → 看到房號
   ```

2. **Participant 加入（手機真機）**
   ```
   掃 QR → 進入
   → 輸入暱稱 → 加入
   → 看到「第 1/12 題」
   ```

3. **快速作答**
   ```
   Participant 迅速完成 12 題
   → 進入 waiting
   ```

4. **Host 鎖定**
   ```
   Host 點「鎖定並揭曉」
   → 成功率三拍出現
   ```

5. **Persona 揭曉**
   ```
   Host 點「公開處刑 🎴」
   → Participant 手機自動翻 Persona
   → 看得到靈魂飯友 / 天敵
   ```

**通過標準：** 全流程無 errors，Realtime 同步無明顯延遲（< 2 秒）

---

## 階段 5：核心合約與阻礙分類

### 5.1 不可改動的 Reveal Contract

**Stage A（鎖定時）：**

```
Host：鎖定並揭曉
↓
session.status = 'locked'
↓
Participants 全部進入 waiting
↓
大螢幕成功率三拍
```

**此時的禁止項目：**

- ❌ 手機不可出現 Persona
- ❌ session 必須是 `locked`（不是 `revealed`）
- ❌ 不可因為畫面變化就提前計算 Persona

**Stage B（公開處刑）：**

```
Host：公開處刑 🎴
↓
finalizeReveal()：
  - persist result_snapshots
  - persist participant_results
  - session.status = 'revealed'
↓
Realtime trigger
↓
Participant 手機自動翻 Persona
```

**此時的禁止項目：**

- ❌ Host 未公開處刑前，任何 client 不得看到 Persona
- ❌ Participant 不需再按任何按鈕
- ❌ `finalizeReveal()` 只由 Persona Reveal 觸發（不能手動觸發）

---

### 5.2 不可改動的遊戲規則

**Persona Scoring：**

```typescript
- 10 種 Persona deterministic
- Option score 加總 → highest wins
- Tie 使用固定 PersonaKey 優先級
- 不使用 threshold / random
```

**Dinner Success Rate：**

```typescript
questionAgreement = max(optionCounts) / sampleSize
successRate = round(mean(questionAgreement) * 100)

Verdict:
- 80–100: 今晚直接出門
- 68–79: 今晚約得成
- 56–67: 約得成，不要全民表決
- 0–55: 有機會約成，指定隊長
- < 2 complete participants: 樣本不足
```

**Questionnaire Selection：**

```typescript
- v0.1: 固定 8 題（legacy room）
- v0.2: deterministic 12 題（24 題庫，6 類，每類 2 題）
- 同一房號所有人取同一組
- Reload 不換題
```

**Rare Card：**

```typescript
- 3% 機率獲得 rare card
- 每場至少 1 人保底 rare（即使沒人中籤）
- Rare 與作答內容無關，純機率
```

---

### 5.3 上線阻礙分類

| 阻礙 | 優先級 | 狀態 | 說明 |
|------|--------|------|------|
| **P0：Critical（必須解決）** | — | — | — |
| Supabase Anonymous Auth runtime 未驗證 | P0 | VERIFY | 需執行 3.1 Authentication 段落；目前只有配置確認 |
| E2E test CASE-17/18 未在最新 HEAD 重跑 | P0 | VERIFY | 需執行 `pnpm test:e2e` 確認全通過 |
| Vercel project 未建立連接 | P0 | SETUP | 需執行 4.2 Vercel 部署段落；目前只有 config 存在 |
| Persona card SVG fallback 未驗證（缺圖時） | P0 | VERIFY | 需檢查 `src/assets/personas/` 並手動刪檔測試 |
| Dark visual redesign 未 runtime QA（375px / 1920px） | P0 | VERIFY | 需手動驗證 2.2 / 2.3 視覺清單 |
| **P1：High（優先解決）** | — | — | — |
| Host 投影機 readability（2m 距離）| P1 | VERIFY | 需用真實投影機或 2560x1440 分解驗證 |
| Audio preference persistence 未驗證 | P1 | VERIFY | CASE-18 通過後確認 |
| Incomplete participant 顯示與 Persona 不干擾 | P1 | VERIFY | 需手動 session 中有人未完成時驗證 |
| **P2：Medium（可上線後處理）** | — | — | — |
| Persona webp asset 升級（目前用 SVG fallback） | P2 | OPTIONAL | 若圖片缺失，SVG fallback 已可用；美術資產為可選 |
| 舊 remote branches 清理 | P2 | CLEANUP | `main` 可用即足夠；舊分支清理為 repo hygiene |

---

## 執行時程表

### Week 1（10/1～10/2）

**Day 1（10/1）：**

- [ ] 08:00 - 讀取本計畫；環境準備
- [ ] 08:30 - 執行階段 1（Backend 驗證）
  - [ ] Supabase auth runtime 驗證
  - [ ] RLS 策略檢查
  - [ ] Realtime 同步驗證
- [ ] 11:00 - 執行階段 3（自動化測試）
  - [ ] `pnpm test:unit`
  - [ ] `pnpm typecheck`
  - [ ] `pnpm build`
  - [ ] `pnpm test:e2e`（重點：CASE-17/18）
- [ ] 14:00 - 執行階段 2（UI 手動驗證 part 1）
  - [ ] Participant flow（375px mobile）
  - [ ] 兩段式 Reveal 序列

**Day 2（10/2）：**

- [ ] 08:00 - 執行階段 2 part 2
  - [ ] Host flow（1920px 投影）
  - [ ] Persona card 與 SVG fallback
- [ ] 11:00 - 執行階段 4（環境與部署）
  - [ ] Supabase 環境檢查
  - [ ] Vercel project 建立與部署設定
  - [ ] Production smoke test（真機）
- [ ] 14:00 - 整理結果，產出驗收報告

---

## 驗收清單（Final Sign-off）

**✅ 所有人員簽核：**

後續代理執行時，完成各階段後需回報：

```markdown
## 驗收報告樣板

**執行日期：** 2026-10-XX

### 階段 1：Backend（必須 100% 通過）
- [x] Supabase auth runtime 驗證：通過 / 失敗 / 阻礙
- [x] RLS 策略驗證：通過 / 失敗 / 阻礙
- [x] Realtime 同步驗證：通過 / 失敗 / 阻礙

### 階段 2：Frontend（視覺 + 流程）
- [x] Participant flow：通過 / 失敗
- [x] Host flow：通過 / 失敗
- [x] Persona card：通過 / 失敗

### 階段 3：Tests
- [x] Unit: 33/33 通過
- [x] Typecheck: 0 errors
- [x] Build: dist/ 生成無誤
- [x] E2E: 18/18 CASE 通過

### 階段 4：Deploy
- [x] Supabase 環境檢查：通過
- [x] Vercel project 建立：通過
- [x] Production smoke test：通過

### 阻礙

若發現 P0 / P1 阻礙，列出：
- **阻礙名稱**
- **根本原因**
- **解決建議**
- **狀態**（已解決 / 待後續）

---

**簽名：** [執行代理]  
**上線狀態：** ✅ READY_TO_LAUNCH / ⚠️ CONDITIONAL / ❌ BLOCKED
```

---

## 附錄：參考資源

### 代碼結構

```
src/
  ├── App.vue                      # 主頁面路由
  ├── main.ts                      # Vite 入口
  ├── domain/
  │   ├── domain.ts               # Persona scoring / success rate 計算
  │   ├── domain.test.ts           # Unit tests
  │   ├── questions.ts             # 24 題題庫（v0.2）
  │   ├── foods.ts                 # 忌口選項
  │   └── types.ts                 # 型別定義
  ├── lib/
  │   ├── supabase.ts              # Supabase client
  │   ├── database.types.ts        # Auto-generated from Supabase
  │   ├── session-service.ts       # Session / Participant 邏輯
  │   ├── audio.ts                 # 音效控制
  │   └── avatars.ts               # Persona metadata
  ├── components/
  │   └── PersonaGlyph.vue         # SVG fallback
  └── assets/
      └── personas/                # *.webp Persona 圖片

tests/
  ├── e2e/
  │   └── lunch-roulette.spec.ts   # Playwright CASE-01～18
  └── db/                          # DB 檢查（如有）

openspec/
  ├── config.yaml                  # OpenSpec 管理設定
  └── changes/
      └── lunch-roulette-mvp/      # MVP 規格變更
          ├── proposal.md
          ├── design.md
          └── tasks.md

supabase/
  └── migrations/                  # DB schema migrations
```

### 關鍵 commit 與基準

- **ac9206d**：移除 obsolete food-consensus fallback（核心遊戲邏輯收斂）
- **92dd835**：test(food-consensus) 驗證 no-safe-state contract
- **bab2aa5**：docs 記錄 Vercel 部署證據（當前 HEAD）

### 既有驗證證據

- ✅ **2026-09-30**：`pnpm install --frozen-lockfile` 通過
- ✅ **2026-09-30**：`pnpm test:unit` 33 項通過
- ✅ **2026-09-30**：`pnpm typecheck` 無 errors
- ✅ **2026-09-30**：`pnpm build` 產出 `dist/` 無誤
- ✅ **2026-09-30**：Playwright 16 項通過（較早 HEAD）
- ⚠️ **2026-10-01**：CASE-17/18 新增；最新 HEAD 未重跑
- ✅ **2026-09-30**：Supabase `hvaxoopyccwsqmhjnibg` ACTIVE_HEALTHY
- ⚠️ **TBD**：Anonymous Auth runtime 驗證
- ⚠️ **TBD**：Vercel deployment 驗證

---

**版本：** 1.0  
**最後更新：** 2026-10-01  
**狀態：** Ready for Execution  
**下一步：** 執行階段 1～5，逐一驗收簽核
