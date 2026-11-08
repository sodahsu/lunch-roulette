import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// 暫不開放搜尋收錄：網站維持公開，只是請搜尋引擎先不要索引。
// 撤回時刪掉 vercel.json 的 X-Robots-Tag 與 index.html 的 robots meta，並同步移除或反轉本檔斷言。
const root = fileURLToPath(new URL('../../', import.meta.url))

interface VercelConfig {
  headers?: { source: string; headers: { key: string; value: string }[] }[]
}

const config: VercelConfig = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'))

function robotsMeta(html: string) {
  return html.match(/<meta\s+name="robots"\s+content="([^"]*)"\s*\/?>/i)?.[1]
}

describe('暫不開放搜尋收錄', () => {
  it('vercel.json 對所有路徑回 X-Robots-Tag: noindex', () => {
    // Vercel 的 source 用 path-to-regexp，`/(.*)` 涵蓋根路徑與所有子路徑（含 /og-image.png、/favicon.ico）
    const catchAll = (config.headers ?? []).filter((rule) => rule.source === '/(.*)')
    expect(catchAll).toHaveLength(1)
    const tag = catchAll[0]!.headers.find((header) => header.key.toLowerCase() === 'x-robots-tag')
    expect(tag?.value).toBe('noindex, nofollow')
  })

  it('原始 index.html 有 robots noindex meta', () => {
    expect(robotsMeta(readFileSync(join(root, 'index.html'), 'utf8'))).toBe('noindex, nofollow')
  })

  // Disallow 全站會讓爬蟲讀不到 noindex，已收錄的頁面反而不會被移除
  it('robots.txt 若存在，不得 Disallow 全站', () => {
    const file = join(root, 'public/robots.txt')
    if (!existsSync(file)) return
    const text = readFileSync(file, 'utf8')
    expect(text).not.toMatch(/^\s*Disallow:\s*\/\s*$/im)
  })

  describe('build 輸出', () => {
    // CI 的順序是單元測試先於 build，所以這裡自行 build 到暫存目錄，不依賴也不污染 dist/
    const outDir = mkdtempSync(join(tmpdir(), 'lunch-roulette-noindex-'))
    let builtHtml = ''

    beforeAll(() => {
      const result = spawnSync(
        process.execPath,
        [join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'],
        { cwd: root, env: { ...process.env, NODE_ENV: 'production' }, encoding: 'utf8' },
      )
      if (result.status !== 0) throw new Error(`vite build 失敗：${result.stderr || result.stdout}`)
      builtHtml = readFileSync(join(outDir, 'index.html'), 'utf8')
    }, 120_000)

    afterAll(() => {
      rmSync(outDir, { recursive: true, force: true })
    })

    it('build 後的 index.html 含 robots noindex meta', () => {
      expect(robotsMeta(builtHtml)).toBe('noindex, nofollow')
    })
  })
})
