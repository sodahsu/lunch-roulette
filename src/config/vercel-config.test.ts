import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface VercelConfig {
  ignoreCommand?: string
  git?: { deploymentEnabled?: Record<string, boolean> | boolean }
}

const config: VercelConfig = JSON.parse(
  readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'),
)

// Vercel 文件：ignoreCommand exit 0 = 略過建置（CANCELED），exit 1 = 繼續建置。
function ignoreExitCode(branch: string): number | null {
  return spawnSync('sh', ['-c', config.ignoreCommand ?? 'exit 1'], {
    env: { ...process.env, VERCEL_GIT_COMMIT_REF: branch },
  }).status
}

describe('vercel.json 部署政策', () => {
  it('只有 main 會繼續建置', () => {
    expect(ignoreExitCode('main')).toBe(1)
  })

  // `*` 不跨 `/`，含斜線的分支（sodahsu/xxx、docs/17-xxx）曾因此產生 Preview，
  // 所以非 main 分支一律要由 ignoreCommand 略過。
  it.each([
    'dev',
    'sodahsu/vercel-preview-guard',
    'docs/17-something',
    'task/solo-start-finish',
    'feat/a/b/c',
    'main-backup',
    'release/main',
  ])('非 main 分支 %s 一律略過建置', (branch) => {
    expect(ignoreExitCode(branch)).toBe(0)
  })

  it('deploymentEnabled 預設全關，只開 main，且 pattern 涵蓋含 / 的分支', () => {
    const rules = config.git?.deploymentEnabled
    expect(typeof rules).toBe('object')
    const map = rules as Record<string, boolean>
    expect(map['**']).toBe(false)
    expect(map['main']).toBe(true)
    expect(Object.entries(map).filter(([, enabled]) => enabled)).toEqual([
      ['main', true],
    ])
  })
})
