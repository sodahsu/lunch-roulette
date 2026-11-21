import { defineConfig } from '@playwright/test'
import { requireIsolatedE2EEnvironment } from './src/config/e2e-isolation'

// 所有 Playwright 執行入口（含 pnpm exec playwright test）都先驗證資料庫。
// Vite 不可繼承正式 env；僅將獨立測試專案的 URL/key 注入其子程序。
const isolatedEnv = requireIsolatedE2EEnvironment(process.env)

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
  },
  webServer: {
    command: 'pnpm dev --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    env: { ...process.env, ...isolatedEnv },
  },
})
