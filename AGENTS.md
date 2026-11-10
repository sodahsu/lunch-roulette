# AGENTS.md — Lunch Roulette AI Worker 規則

接手前先讀 `HANDOFF.md`（進度與踩坑的唯一來源）、`README.md`，再讀對應的 `openspec/` change。HANDOFF 是某日的狀態快照，動工前先 `git fetch` 並以 `origin/dev` 與 CI 實況為準。

## 分支模型
- `dev` 是整合分支，`main` 是發布線；功能一律先進 `dev`，不得日常以 `main` 為 PR 目標。
- `.github/workflows/branch-policy.yml` 只檢查 PR 方向，不檢查分支命名、也不要求 issue 號：
  - base 是 `main` 時，head 必須是 `dev`，否則 CI 失敗。
  - base 是 `dev` 時，head 不得是 `main`（main 的修正改用 task 分支 cherry-pick 或合併後再 PR 進 `dev`）。
- 命名慣例（非 CI 強制，沿用既有 PR）：`feature/<slug>`、`task/<slug>`、`docs/<slug>`。
- `dev`、`main` 都沒有 branch protection，沒有機器擋直接 push，只能靠本文件遵守。
- 此 guard 只存在 `dev`；PR 到 `main` 跑的是 `main` 的 workflow，開分支前先確認基底是 `origin/dev`。

## 交付流程
1. 從最新 `origin/dev` 開獨立分支；本機並行時每個 worker 用獨立 `git worktree`，不切換他人正在用的工作樹。
2. 行為或需求變更：先在 `openspec/changes/<change-name>/` 建 `proposal.md`、`design.md`、`tasks.md`、`specs/`（繁體中文），驗收情境確定才改程式。純文件或 chore 不改行為者可不建 change。
3. 實作；`tasks.md` 的項目通過相關測試後才勾選。
4. 驗證（見下節），把實際指令與結果寫進 PR。
5. 開 PR 到 `dev`。Commit 格式 `type(scope): 繁中 subject`（`feat`/`fix`/`docs`/`chore`），內文說 why。
6. CI 全綠後才請求合併；合併須使用者明確指示，worker 不自行合併。repo 慣例是 merge commit。

## 驗證指令（pnpm 10.30.3、Node 22）
```bash
pnpm install --frozen-lockfile
pnpm typecheck        # vue-tsc -b
pnpm test:unit        # vitest run
pnpm build            # vue-tsc -b && vite build
pnpm test:e2e         # playwright test，webServer 為 127.0.0.1:4173
pnpm dlx @fission-ai/openspec validate --all --strict --no-interactive
```
- CI（`solo-start-ci.yml`，對 `dev`／`main` 的 PR 與 `dev` push 觸發）依序跑 unit、typecheck、build、OpenSpec strict、E2E。
- Playwright 設了 `reuseExistingServer`，本機若已有 dev server 佔用 4173 會被沿用；先確認埠號再跑 E2E。
- 沒實際跑過就不寫「已通過」；回報時分開「已驗證」「只寫好程式」「尚未測試」。

## 禁止事項
- 直接 push `main` 或 `dev`；一律走分支與 PR。
- force push、`git reset --hard` 重寫共享歷史；不改別人的分支。
- `--no-verify` 或任何繞過 git hook／CI 的做法。
- 未經使用者同意修改遠端 Supabase schema、RLS 或套用 migration。遠端不要用 `supabase db push`，本機也沒有 Supabase CLI／`psql`；migration 檔在 `supabase/migrations/`，過去是在 Dashboard SQL Editor 手動套用。
- 未經使用者同意合併到 `main`、建立 tag 或 GitHub Release；這三項屬 `dev → main` 的獨立發布 gate。
- 把 service-role／secret key 放進前端或 Git；不放寬 participant 只能讀自己 response／result 的隱私邊界。
- 拿掉 `src/lib/supabase.ts` 的 env fallback：Vercel Preview 沒設 `VITE_SUPABASE_*`，拿掉會白畫面。

## 本機環境
- 連線設定參照 `.env.example`，複製成 `.env.local`（`.env`、`.env.*` 已 gitignore，`.env.example` 除外）。
- 變數名：`VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`。值不得寫進文件、PR 或 commit message。
- 未設定時程式會 fallback 到預設的 Supabase 專案，因此本機 E2E 會對該專案寫測試房間；要隔離就自行指定另一個專案的變數。

## 停止並詢問
`dev` 與 `main` 出現分歧、CI 為紅、需要動遠端 Supabase、或不確定授權範圍時，停下來問使用者，不自行推論。
