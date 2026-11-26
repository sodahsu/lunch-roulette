# 都可以？ / lunch-roulette

> **多人即時飯局人格社交遊戲｜專治「隨便、都可以」的世紀大難題**
> 嘴上每個人都說「超好約、吃什麼都可以」，結果一問去哪吃就全員裝死。
> 12 題靈魂拷問，當場算出這團今晚到底約不約得成，並公開翻牌抓出誰才是隱形挑食王！

---

## 💡 為什麼做這個小工具？

每次朋友聚餐、同事午餐，群組最怕空氣突然安靜：
- 「等一下吃什麼？」
- 「隨便啊，我都 OK～」
- 「那吃義大利麵？」「呃……昨天才吃過。」
- 「那吃火鍋？」「今天有點熱耶……」
- 「那到底要吃什麼？」「我都可以啊，看你們～」

大家嘴上都說「都可以」，心裡卻各有堅持。
《都可以？》是一場看似和平、實則殘酷又爆笑的**即時飯局社交實驗**：不用開冗長投票，只要兩分鐘做完 12 題二選一測驗，系統就會直接算出「這團今晚約成飯的機率（%）」，在眾目睽睽下翻出每個人的**飯局人格卡**、配對出**靈魂飯友**與**飲食天敵**，最後自動剔除所有人的地雷，端出一份「全員都能和平開飯」的安全名單！

---



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

Solo-start 已在 `v0.2.0`（2026-10-03）上線，規格於 2026-11-08 歸檔進 `openspec/specs/`。它的設計是「1 個人就能先開局，朋友之後再加入」，不是另外做一套 Solo mode：

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

## 🃏 10 種飯局人格卡 & 玩法亮點

每局結算時，系統依 12 題得分達成率為每位玩家頒發專屬 **Collectible Persona 飯局人格卡**（含原創插圖與毒舌一句話評語）：

| 代號 | 飯局人格 | 一句話人設 |
| :--- | :--- | :--- |
| 🐻‍❄️ `01` | **和平飯友** (`PEACEKEEPER`) | 「碗在空中飛，我心如止水，吃什麼都可以。」 |
| 🐺 `02` | **逆風美食家** (`CONTRARIAN`) | 「大家吃火鍋，我端著沙拉逆風而行。」 |
| 🐈 `03` | **挑食王** (`PICKY EATER`) | 「朕看過菜單了，全部退下。」 |
| 🐧 `04` | **新店敢死隊** (`ADVENTURE TYPE`) | 「Google 評論只有三則？旗子我都插好了。」 |
| 🦉 `05` | **CP 值守門員** (`VALUE HUNTER`) | 「先讓我按一下計算機，再決定要不要愛你。」 |
| 🦥 `06` | **五百公尺極限派** (`HOME RADIUS TYPE`) | 「超過兩個路口就是遠征，我選擇躺著等外送。」 |
| 🐯 `07` | **美食狂熱者** (`FOOD FANATIC`) | 「排四十分鐘？我已經在店門口吼了。」 |
| 🐰 `08` | **真・都可以** (`TRULY EASYGOING`) | 「我真的都可以，兔兔發誓，不騙你。」 |
| 🦊 `09` | **全都要選手** (`ALL-IN EATER`) | 「菜單上的我全都要，誰付錢等一下再說。」 |
| 🐼 `10` | **點菜總管** (`ORDER CAPTAIN`) | 「桌上我來排，誰敢亂動我的蒸籠。」 |

### ✨ 還有這些讓人玩到停不下來的細節
- 🌟 **★ SSR 頂級稀有卡（金框保底機制）**：每局每人都有 3% 機率抽中閃亮金色外框的 SSR 稀有卡；若全場沒人中籤，系統還會從中保底送出 1 張，保證每局都有人歐氣爆發！
- 🤝 **靈魂飯友 vs 飲食天敵**：依 12 題作答相似度自動配對——誰跟你想法幾乎一模一樣、誰跟你一題不合就準備在餐桌上打架，翻牌瞬間全場立刻對號入座。
- 📸 **一鍵下載社群分享圖卡（1080×1350 PNG）**：可匯出個人「人格卡」與「團體成功率卡」發限動；卡面文字刻意不印出他人暱稱與房號，分享不洩漏朋友隱私。
- ⚡ **即時多端同步 ＋ 儀式感音效**：主揪大螢幕與團員手機透過 Supabase Realtime 即時連動，搭配倒數與翻牌音效（右上角可隨時靜音）。
- 🎨 **Dark Editorial 黑色展覽感設計**：低調黑底（`#0b0b0c`）搭配 Electric Blue（`#4c6fff`）與 Acid Lime（`#c7ff3d`）螢光撞色，聚餐氣氛直接拉滿。
- 🛡️ **100% 匿名、免註冊**：採用 Supabase 匿名驗證（Anonymous Sign-In），打開網頁就能玩，不需填 Email 或綁定任何社群帳號。

---

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

### 隱私與資料保存

資料保留期限為：已揭曉場次自揭曉起 30 天，未揭曉場次自建立起 30 天。對應的每日自動清理排程定義於 migration；正式資料庫尚未套用。排程會依外鍵一併刪除參加者資料、作答、團體結果和個人結果。分享連結找不到場次時，頁面會提示連結可能已過期，請確認房號或請主持人重開。詳見[資料保留與清理計畫](docs/data-retention-and-rls.md)。

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

**注意：E2E 會建立真實測試房間；未提供與正式環境不同的 Supabase 測試專案時會直接中止。** 不要把正式專案的 URL 或 publishable key 填入 E2E 變數。

建立隔離測試專案後，先完成以下設定：

1. 依序套用 `supabase/migrations/` 全部 migrations，包含 PR #45（issue #43）的 `20261121_restore_authenticated_rls_access.sql`，為 `authenticated` 提供資料表最小權限。PR #44 不含這支 migration；合併順序上，若先合併或先驗證 #44，隔離測試專案仍須先套用 #45 的權限 migration，正式環境則依 #45 流程由管理者評估套用。權限由 migration 管理，不要為了讓測試通過而手動放寬 RLS。
2. 啟用 Anonymous Auth，並確認 migrations 設定的 Realtime publication 已生效。若匿名登入成功，但建立房間時出現 `42501`（資料表權限不足），先確認上述權限 migration 是否已套用。
3. 調整測試專案的 Anonymous Sign-ins 速率限制（例如每 IP 每小時 120 次）：完整 26 案 E2E 單輪會建立數十個匿名使用者，預設 30/hr 會在 CASE-08～09 觸發限流。

```bash
pnpm test:unit
pnpm typecheck
pnpm build
E2E_SUPABASE_URL=https://YOUR-TEST-PROJECT.supabase.co \
E2E_SUPABASE_PUBLISHABLE_KEY=YOUR_TEST_PUBLISHABLE_KEY pnpm test:e2e
```

GitHub Actions 也必須由倉庫管理者配置 `E2E_SUPABASE_URL`、`E2E_SUPABASE_PUBLISHABLE_KEY` 兩個 Secrets，指向完成上述設定的隔離專案。Secrets 未配置時 **E2E CI 應失敗，不得回退正式專案**。Playwright 禁止重用既存開發伺服器，避免測試跑到正式連線；網站一般使用者流程仍保留原本 Supabase fallback。

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

## 📂 專案結構導覽

- `src/App.vue`：主畫面與完整流程狀態機（開房大廳、主揪控制台、12 題答題、忌口排除、兩段式揭曉、個人結果與全員總覽）
- `src/domain/`：核心領域邏輯 — 48 題題庫與 10 種人格定義（`questions.ts`）、計分／配對／成功率與稀有卡演算法（`domain.ts`）、12 類忌口共識運算（`foods.ts`）、分享圖卡資料模型（`share-card.ts`）
- `src/lib/`：Supabase client（`supabase.ts`）、房間與 Realtime 即時同步服務（`session-service.ts`）、1080×1350 PNG 圖卡繪製（`share-card.ts`）、音效（`audio.ts`）與頭像對應（`avatars.ts`）
- `src/assets/`：10 種飯局人格插圖（`personas/*.webp`）與 10 款玩家頭像（`avatars/*.webp`）
- `src/components/`：共用元件（`PersonaGlyph.vue`）
- `supabase/migrations/`：PostgreSQL 資料表與 RLS 權限控管遷移檔
- `tests/`：Playwright 完整多端使用者情境測試（`CASE-01～26`）與資料庫 RLS smoke test
- `openspec/`：產品功能規格與各階段變更設計文件

---

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

現行已驗證規格（截至 2026-11-10）：

- `openspec/specs/`

目前沒有 active change；`openspec/changes/` 下只有 `archive/`。已歸檔的 change：

- `openspec/changes/archive/2026-10-01-lunch-roulette-mvp/`
- `openspec/changes/archive/2026-11-08-solo-start/`（PR #32）
- `openspec/changes/archive/2026-11-08-result-share-card/`（PR #32）
- `openspec/changes/archive/2026-11-10-share-upgrade/`
- `openspec/changes/archive/2026-11-10-questionnaire-v03/`

主要 capability：

- `live-session`
- `preference-quiz`
- `result-reveal`
- `food-consensus`
- `link-preview`

`solo-start` 已於 2026-11-08 歸檔，delta 併入 `openspec/specs/`。2026-10-03 修正 CASE-01 timeout 的根因（open 預覽蓋掉主持人的鎖定按鈕），unit / typecheck / build / OpenSpec strict / full E2E 在 CI 通過，1 → 2 → 3 人 runtime smoke、locked / revealed late join 與 privacy / RLS smoke 也已通過，隨 `v0.2.0` 上線。

詳細測試追溯與完成 gate：`docs/solo-start-test-plan.md`（2026-10 的歷史紀錄）。


## Release versioning

App Release 使用 Semantic Versioning，與資料欄位 `questionnaire_version` 分開管理：

- `package.json#version` / Git tag / GitHub Release：代表整個 Web App 的發布版本。
- `questionnaire_version`：只代表題組與對應 domain algorithm contract，不等於 App Release。

已發布版本（截至 2026-11-10）：

| Tag | 日期 | GitHub Release | 內容 |
|---|---|---|---|
| `v0.2.0-rc.1` | 2026-10-03 | 無（只有 tag） | Solo-start 的 release candidate |
| `v0.2.0` | 2026-10-03 | 有 | Solo-start 單人先開局 |
| `v0.2.1` | 2026-10-11 | 有（目前標為 Latest） | Realtime 同步修正 |
| `v0.2.2` | 2026-11-05 | 無（只有 tag） | `attachRealtime` 不再等握手（PR #24～#26） |

`main` 在 `v0.2.2` 之後已多 27 個 commit（`git describe origin/main` 為 `v0.2.2-27-g0791e41`），包含 PR #28（Supabase 防暫停排程）、#31（人格結果卡與單人開局收尾）、#38（題庫 v0.3、分享升級、Preview 防護、暫停搜尋收錄），`package.json#version` 仍是 `0.2.2`，尚未建立新的 tag 或 GitHub Release；下一個版本號待決定。

正式 Release 不從未驗證的 feature branch 建立，先整合 `dev`，再由 `dev → main` 合併後處理。若要先發 RC 而 RC 驗證失敗，修正後依序遞增 `-rc.2`、`-rc.3`，直到符合 release gate。
