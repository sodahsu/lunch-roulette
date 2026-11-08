// 用既有人格插圖合成連結預覽圖與 favicon，輸出到 public/（不使用影像生成）。
// 重新產生：pnpm exec playwright install chromium && node scripts/build-link-preview.mjs
import { chromium } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public')
const personaKeys = [
  'easygoing', 'glutton', 'foodFanatic', 'peacekeeper', 'picky',
  'adventurer', 'orderCaptain', 'valueHunter', 'homebody', 'contrarian',
]

async function art(key) {
  const buffer = await readFile(join(root, 'src/assets/personas', `${key}.webp`))
  return `data:image/webp;base64,${buffer.toString('base64')}`
}

const arts = Object.fromEntries(await Promise.all(personaKeys.map(async (key) => [key, await art(key)])))

const FONT = `"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif`

function ogHtml() {
  // 第一張（真・都可以）給金色外框，呼應 SSR；其餘為一般卡
  const tiles = personaKeys
    .map(
      (key, index) =>
        `<div class="tile${index === 0 ? ' ssr' : ''}"><img src="${arts[key]}" /></div>`,
    )
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; }
    body { width: 1200px; height: 630px; overflow: hidden; background: #0b0b0c; color: #f5f5f2; font-family: ${FONT};
      background-image: radial-gradient(circle at 78% 40%, rgba(199,255,61,.16), transparent 55%); position: relative; }
    .copy { position: absolute; left: 72px; top: 0; bottom: 0; width: 540px; display: flex; flex-direction: column; justify-content: center; }
    .kicker { color: #8e8e93; font-size: 22px; font-weight: 800; letter-spacing: .14em; }
    h1 { margin-top: 18px; color: #c7ff3d; font-size: 132px; line-height: 1.05; font-weight: 900; white-space: nowrap; }
    .sub { margin-top: 26px; font-size: 44px; font-weight: 900; line-height: 1.25; }
    .desc { margin-top: 18px; color: #b9b9be; font-size: 28px; font-weight: 600; line-height: 1.5; }
    .grid { position: absolute; left: 640px; top: -60px; width: 760px; display: grid; grid-template-columns: repeat(4, 168px); gap: 20px; transform: rotate(-8deg); transform-origin: top left; margin-top: 150px; }
    .tile { width: 168px; height: 168px; border-radius: 30px; overflow: hidden; border: 2px solid rgba(255,255,255,.18); background: #0c0c0f; box-shadow: 0 18px 40px rgba(0,0,0,.45); }
    .tile img { width: 100%; height: 100%; display: block; }
    .tile.ssr { border: 6px solid #e8b923; box-shadow: 0 0 36px rgba(255,200,60,.55), 0 18px 40px rgba(0,0,0,.45); }
  </style></head><body>
    <div class="copy">
      <div class="kicker">DINNER SOCIAL EXPERIMENT</div>
      <h1>都可以？</h1>
      <div class="sub">你們今晚約不約得成？</div>
      <div class="desc">12 題，十種飯局人格。<br/>手機一起玩，結果當場揭曉。</div>
    </div>
    <div class="grid">${tiles}</div>
  </body></html>`
}

function iconHtml(size) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin: 0; }
    html, body { width: ${size}px; height: ${size}px; background: transparent; overflow: hidden; }
    .icon { width: ${size}px; height: ${size}px; border-radius: ${Math.round(size * 0.22)}px; overflow: hidden; background: #0b0b0c; }
    img { width: 100%; height: 100%; display: block; object-fit: cover; transform: scale(1.18); }
  </style></head><body><div class="icon"><img src="${arts.easygoing}" /></div></body></html>`
}

// ICO 容器可直接內嵌 PNG：header 6 bytes + 每張圖 16 bytes 目錄項 + 圖資料
function packIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + images.length * 16
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)])
}

await mkdir(out, { recursive: true })
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.setContent(ogHtml())
  await page.evaluate(() => Promise.all([...document.images].map((image) => image.decode())))
  await writeFile(join(out, 'og-image.png'), await page.screenshot({ type: 'png' }))

  const shots = {}
  for (const size of [16, 32, 48, 180]) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(iconHtml(size))
    await page.evaluate(() => Promise.all([...document.images].map((image) => image.decode())))
    shots[size] = await page.screenshot({ type: 'png', omitBackground: true })
  }
  await writeFile(join(out, 'apple-touch-icon.png'), shots[180])
  await writeFile(
    join(out, 'favicon.ico'),
    packIco([16, 32, 48].map((size) => ({ size, png: shots[size] }))),
  )
} finally {
  await browser.close()
}
console.log('wrote public/og-image.png, public/favicon.ico, public/apple-touch-icon.png')
