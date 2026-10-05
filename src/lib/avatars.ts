// 頭貼由參加者 ID 決定：加入時等同隨機，但重新整理或換裝置都會看到同一隻，不必新增資料庫欄位
const files = import.meta.glob<string>('../assets/avatars/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
})

const AVATARS = Object.keys(files)
  .sort()
  .map((key) => files[key])

export function avatarFor(id: string): string {
  if (AVATARS.length === 0) return ''
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATARS[hash % AVATARS.length] ?? AVATARS[0] ?? ''
}

const personaFiles = import.meta.glob<string>('../assets/personas/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
})

// 檔名即 PersonaKey，缺圖時回傳 undefined 由呼叫端退回 SVG
export function personaArt(key: string): string | undefined {
  return personaFiles[`../assets/personas/${key}.webp`]
}
