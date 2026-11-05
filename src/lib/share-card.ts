import { shareCardText } from '../domain/share-card'
import type { ParticipantResult } from '../domain/types'

export async function sharePersonaCard(result: Pick<ParticipantResult, 'persona' | 'rare'>) {
  const card = shareCardText(result)
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const context = canvas.getContext('2d')
  if (!context) throw new Error('此裝置無法產生圖片')
  context.fillStyle = '#151c20'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#d7ef8b'
  context.font = 'bold 42px sans-serif'
  context.fillText('都可以？ / DINNER IDENTITY', 80, 140)
  context.fillText(card.rarity, 80, 250)
  context.fillStyle = '#ffffff'
  context.font = 'bold 94px sans-serif'
  context.fillText(card.name, 80, 570, 920)
  context.font = '40px sans-serif'
  context.fillText(`「${card.tagline}」`, 80, 710, 920)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('無法產生圖片，請再試一次')
  const file = new File([blob], 'dinner-persona.png', { type: 'image/png' })
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
