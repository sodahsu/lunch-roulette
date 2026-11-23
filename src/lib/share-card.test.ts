import { afterEach, describe, expect, it, vi } from 'vitest'
import { shareGroupCard, sharePersonaCard } from './share-card'

type Call = unknown[]

// 以 Proxy 記錄所有 2D context 呼叫；hasRoundRect 為 false 時模擬 Safari 16 以前沒有 roundRect 的環境
function createFakeContext(hasRoundRect: boolean) {
  const calls = new Map<string, Call[]>()
  const gradient = { addColorStop: () => undefined }
  const results: Record<string, (...args: Call) => unknown> = {
    measureText: (text) => ({ width: String(text).length * 20 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  }
  const assigned: Record<string, unknown> = {}
  const context = new Proxy(assigned, {
    get(_target, key) {
      const name = String(key)
      if (name === 'roundRect' && !hasRoundRect) return undefined
      if (name in assigned) return assigned[name]
      return (...args: Call) => {
        calls.set(name, [...(calls.get(name) ?? []), args])
        return results[name]?.(...args)
      }
    },
    set(_target, key, value) {
      assigned[String(key)] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { context, callsOf: (name: string) => calls.get(name) ?? [] }
}

// 測試環境是 node：只補產卡流程會碰到的瀏覽器 API，並以 Web Share 路徑收尾，避免碰下載與計時器
function stubBrowser(hasRoundRect: boolean) {
  const fake = createFakeContext(hasRoundRect)
  const share = vi.fn(async (_data: ShareData) => undefined)
  vi.stubGlobal('document', {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: (type: string) => (type === '2d' ? fake.context : null),
      toBlob: (callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' })),
    }),
  })
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        queueMicrotask(() => this.onload?.())
      }
    },
  )
  vi.stubGlobal('navigator', { canShare: () => true, share })
  return { ...fake, share }
}

const FRAME = [24, 24, 1032, 1302, 44]
const groupInput = {
  score: 72,
  verdict: '今晚約得成，找一個人負責訂位',
  sampleSize: 6,
  date: new Date('2026-11-10T08:00:00Z'),
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('share-card roundRect 相容性', () => {
  it.each([
    { label: '一般卡', rare: false },
    { label: 'SSR 卡', rare: true },
  ])('沒有 roundRect 時 $label 仍可產生並分享，並改走 moveTo/arcTo 路徑', async ({ rare }) => {
    const env = stubBrowser(false)

    await expect(sharePersonaCard({ persona: 'peacekeeper', rare })).resolves.toBeUndefined()

    expect(env.share).toHaveBeenCalledTimes(1)
    const file = env.share.mock.calls[0]![0].files![0]!
    expect(file.name).toBe('dinner-persona.png')
    // 外框、標籤、插圖裁切與插圖外框共四條圓角路徑，每條四個圓角並封閉
    expect(env.callsOf('moveTo')).toHaveLength(4)
    expect(env.callsOf('arcTo')).toHaveLength(16)
    expect(env.callsOf('closePath')).toHaveLength(4)
    // 第一條是外框（24, 24, 1032 × 1302, r = 44）：起點在上緣右移一個半徑，順時針四個圓角
    expect(env.callsOf('moveTo')[0]).toEqual([68, 24])
    expect(env.callsOf('arcTo').slice(0, 4)).toEqual([
      [1056, 24, 1056, 1326, 44],
      [1056, 1326, 24, 1326, 44],
      [24, 1326, 24, 24, 44],
      [24, 24, 1056, 24, 44],
    ])
  })

  it('有 roundRect 時沿用原生，不走 fallback', async () => {
    const env = stubBrowser(true)

    await sharePersonaCard({ persona: 'peacekeeper', rare: false })

    expect(env.share).toHaveBeenCalledTimes(1)
    expect(env.callsOf('roundRect')).toHaveLength(4)
    expect(env.callsOf('roundRect')[0]).toEqual(FRAME)
    expect(env.callsOf('moveTo')).toHaveLength(0)
    expect(env.callsOf('arcTo')).toHaveLength(0)
  })

  it('標籤膠囊的半徑不會超過高度的一半', async () => {
    const env = stubBrowser(false)

    await sharePersonaCard({ persona: 'peacekeeper', rare: false })

    // 第二條路徑是標籤膠囊，高 62、半徑 31：四個圓角都用 31，不會被放大
    const pillArcs = env.callsOf('arcTo').slice(4, 8)
    expect(pillArcs.map((args) => args[4])).toEqual([31, 31, 31, 31])
  })

  it('沒有 roundRect 時團體成功率卡仍可產生並分享', async () => {
    const env = stubBrowser(false)

    await expect(shareGroupCard(groupInput)).resolves.toBe(true)

    expect(env.share).toHaveBeenCalledTimes(1)
    expect(env.share.mock.calls[0]![0].files![0]!.name).toBe('dinner-group-success.png')
    expect(env.callsOf('moveTo')).toEqual([[68, 24]])
    expect(env.callsOf('arcTo')).toHaveLength(4)
    expect(env.callsOf('closePath')).toHaveLength(1)
  })

  it('團體成功率卡有 roundRect 時沿用原生', async () => {
    const env = stubBrowser(true)

    await expect(shareGroupCard(groupInput)).resolves.toBe(true)

    expect(env.callsOf('roundRect')).toEqual([FRAME])
    expect(env.callsOf('arcTo')).toHaveLength(0)
  })
})
