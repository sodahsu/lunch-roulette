import {
  groupShareCard,
  personaShareCard,
  type GroupShareCard,
  type GroupShareCardInput,
  type PersonaShareCard,
} from '../domain/share-card'
import { PERSONAS } from '../domain/questions'
import type { ParticipantResult } from '../domain/types'
import { personaArt } from './avatars'

const WIDTH = 1080
const HEIGHT = 1350
const FONT = '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", -apple-system, sans-serif'
const BG = '#0b0b0c'
const LIME = '#c7ff3d'
const GOLD = ['#fff3b0', '#d4a017', '#fff8d6', '#b8860b', '#ffe27a']
const MUTED = '#8e8e93'
// 成功率環要避開上方標題（標題基線 250、環頂 = CY - RADIUS - 線寬一半）
const GAUGE_CY = 650
const GAUGE_RADIUS = 300

type Ctx = CanvasRenderingContext2D

function createCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('此裝置無法產生圖片')
  return { canvas, context }
}

// 插圖與頁面同源（Vite 資產），canvas 不會被污染；載入失敗回傳 null，讓卡片退回純文字版而不是讓分享失敗
function loadImage(src: string | undefined): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null)
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

function goldGradient(context: Ctx, x0: number, y0: number, x1: number, y1: number) {
  const gradient = context.createLinearGradient(x0, y0, x1, y1)
  GOLD.forEach((color, index) => gradient.addColorStop(index / (GOLD.length - 1), color))
  return gradient
}

function roundRect(context: Ctx, x: number, y: number, w: number, h: number, r: number) {
  context.beginPath()
  context.roundRect(x, y, w, h, r)
}

function drawBackground(context: Ctx, glow: string) {
  context.fillStyle = BG
  context.fillRect(0, 0, WIDTH, HEIGHT)
  const radial = context.createRadialGradient(WIDTH / 2, 560, 60, WIDTH / 2, 560, 900)
  radial.addColorStop(0, glow)
  radial.addColorStop(1, 'rgba(11, 11, 12, 0)')
  context.fillStyle = radial
  context.fillRect(0, 0, WIDTH, HEIGHT)
}

function drawFrame(context: Ctx, rare: boolean) {
  if (rare) {
    context.save()
    context.shadowColor = 'rgba(255, 200, 60, .55)'
    context.shadowBlur = 36
    context.lineWidth = 14
    context.strokeStyle = goldGradient(context, 0, 0, WIDTH, HEIGHT)
    roundRect(context, 24, 24, WIDTH - 48, HEIGHT - 48, 44)
    context.stroke()
    context.restore()
    return
  }
  context.lineWidth = 3
  context.strokeStyle = 'rgba(255, 255, 255, .16)'
  roundRect(context, 24, 24, WIDTH - 48, HEIGHT - 48, 44)
  context.stroke()
}

// 中文沒有空白可斷，逐字換行；最多兩行，超過以刪節號收尾
function wrapLines(context: Ctx, text: string, maxWidth: number, maxLines: number) {
  const lines: string[] = []
  let line = ''
  for (const char of text) {
    if (line && context.measureText(line + char).width > maxWidth) {
      lines.push(line)
      line = char
    } else {
      line += char
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  kept[maxLines - 1] = `${kept[maxLines - 1]!.slice(0, -1)}…`
  return kept
}

function drawCentered(context: Ctx, text: string, y: number, maxWidth: number) {
  context.textAlign = 'center'
  context.fillText(text, WIDTH / 2, y, maxWidth)
  context.textAlign = 'left'
}

function drawPill(context: Ctx, label: string, rare: boolean) {
  context.font = `800 30px ${FONT}`
  const textWidth = context.measureText(label).width
  const w = textWidth + 56
  const h = 62
  const x = WIDTH - 80 - w
  const y = 96
  roundRect(context, x, y, w, h, h / 2)
  if (rare) {
    context.fillStyle = goldGradient(context, x, y, x + w, y + h)
    context.fill()
    context.fillStyle = '#2a1d00'
  } else {
    context.lineWidth = 2
    context.strokeStyle = 'rgba(199, 255, 61, .55)'
    context.stroke()
    context.fillStyle = LIME
  }
  context.textBaseline = 'middle'
  context.fillText(label, x + 28, y + h / 2 + 2)
  context.textBaseline = 'alphabetic'
}

function drawArt(context: Ctx, image: HTMLImageElement | null, card: PersonaShareCard) {
  const size = 720
  const x = (WIDTH - size) / 2
  const y = 200
  context.save()
  roundRect(context, x, y, size, size, 56)
  context.clip()
  const panel = context.createRadialGradient(WIDTH / 2, y + size * 0.42, 40, WIDTH / 2, y + size * 0.42, size * 0.75)
  panel.addColorStop(0, card.rare ? 'rgba(255, 214, 90, .34)' : 'rgba(199, 255, 61, .16)')
  panel.addColorStop(1, '#0c0c0f')
  context.fillStyle = panel
  context.fillRect(x, y, size, size)
  if (image) {
    context.drawImage(image, x, y, size, size)
  } else {
    context.font = `300px ${FONT}`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(PERSONAS[card.persona].emoji, WIDTH / 2, y + size / 2 + 16)
    context.textAlign = 'left'
    context.textBaseline = 'alphabetic'
  }
  context.restore()
  context.lineWidth = card.rare ? 6 : 2
  context.strokeStyle = card.rare ? goldGradient(context, x, y, x + size, y + size) : 'rgba(255, 255, 255, .18)'
  roundRect(context, x, y, size, size, 56)
  context.stroke()
}

async function renderPersonaCard(result: Pick<ParticipantResult, 'persona' | 'rare'>) {
  // 只經過白名單欄位：配對、稀有原因與其他玩家資料沒有路徑可以進到畫面
  const card = personaShareCard(result)
  const image = await loadImage(personaArt(card.persona))
  const { canvas, context } = createCanvas()

  drawBackground(context, card.rare ? 'rgba(255, 200, 60, .20)' : 'rgba(199, 255, 61, .10)')
  drawFrame(context, card.rare)

  context.fillStyle = card.rare ? GOLD[0]! : LIME
  context.font = `900 44px ${FONT}`
  context.fillText('都可以？', 80, 140)
  drawPill(context, card.rarity, card.rare)

  drawArt(context, image, card)

  context.font = `900 100px ${FONT}`
  context.fillStyle = card.rare ? goldGradient(context, 160, 1000, 920, 1100) : '#ffffff'
  drawCentered(context, card.name, 1065, 880)

  context.font = `600 38px ${FONT}`
  context.fillStyle = card.rare ? '#ffe9a0' : '#d6d6da'
  const lines = wrapLines(context, `「${card.tagline}」`, 860, 2)
  lines.forEach((line, index) => drawCentered(context, line, 1140 + index * 56, 900))

  context.font = `700 28px ${FONT}`
  context.fillStyle = MUTED
  drawCentered(context, '多人飯局人格社交實驗', 1290, 900)
  return canvas
}

function drawGauge(context: Ctx, score: number) {
  const cx = WIDTH / 2
  const cy = GAUGE_CY
  const radius = GAUGE_RADIUS
  context.lineCap = 'round'
  context.lineWidth = 36
  context.strokeStyle = 'rgba(255, 255, 255, .09)'
  context.beginPath()
  context.arc(cx, cy, radius, 0, Math.PI * 2)
  context.stroke()
  if (score > 0) {
    context.save()
    context.shadowColor = 'rgba(199, 255, 61, .45)'
    context.shadowBlur = 30
    context.strokeStyle = LIME
    context.beginPath()
    context.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * score) / 100)
    context.stroke()
    context.restore()
  }
  context.lineCap = 'butt'
}

function renderGroupCard(card: GroupShareCard) {
  const { canvas, context } = createCanvas()
  drawBackground(context, 'rgba(199, 255, 61, .12)')
  drawFrame(context, false)

  context.fillStyle = LIME
  context.font = `900 44px ${FONT}`
  context.fillText('都可以？', 80, 140)
  context.font = `800 30px ${FONT}`
  context.fillStyle = MUTED
  context.textAlign = 'right'
  context.fillText('GROUP RESULT', WIDTH - 80, 138)
  context.textAlign = 'left'

  context.font = `800 46px ${FONT}`
  context.fillStyle = '#ffffff'
  drawCentered(context, card.title, 250, 900)

  drawGauge(context, card.score)
  context.font = `900 230px ${FONT}`
  context.fillStyle = '#ffffff'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(card.scoreText, WIDTH / 2, GAUGE_CY + 10, 520)
  context.textBaseline = 'alphabetic'
  context.textAlign = 'left'

  context.font = `800 54px ${FONT}`
  context.fillStyle = LIME
  const lines = wrapLines(context, card.verdict, 880, 2)
  lines.forEach((line, index) => drawCentered(context, line, 1070 + index * 74, 920))

  context.font = `700 32px ${FONT}`
  context.fillStyle = '#b9b9be'
  drawCentered(context, `${card.sampleText}  ·  ${card.dateText}`, 1240, 900)

  context.font = `700 26px ${FONT}`
  context.fillStyle = MUTED
  drawCentered(context, '多人飯局人格社交實驗', 1295, 900)
  return canvas
}

// 支援檔案分享就走系統分享，否則下載；使用者取消分享時由呼叫端處理 AbortError
async function deliverCanvas(canvas: HTMLCanvasElement, fileName: string) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('無法產生圖片，請再試一次')
  const file = new File([blob], fileName, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] })
    return
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function sharePersonaCard(result: Pick<ParticipantResult, 'persona' | 'rare'>) {
  await deliverCanvas(await renderPersonaCard(result), 'dinner-persona.png')
}

// 回傳 false 表示有效樣本不足、沒有產生卡片
export async function shareGroupCard(input: GroupShareCardInput) {
  const card = groupShareCard(input)
  if (!card) return false
  await deliverCanvas(renderGroupCard(card), 'dinner-group-success.png')
  return true
}
