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
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATARS[hash % AVATARS.length]!
}
