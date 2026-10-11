/**
 * 32-bit FNV-1a (Fowler-Noll-Vo) 雜湊演算法與標準常數。
 * 具備快速、分散均勻與跨執行緒結果完全確定（Deterministic）之特性，
 * 用於依據房號種子穩定挑選題目與確定性抽籤。
 */
export const FNV_OFFSET_BASIS_32 = 2166136261
export const FNV_PRIME_32 = 16777619

export function hashFnv1a(value: string): number {
  let hash = FNV_OFFSET_BASIS_32
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, FNV_PRIME_32)
  }
  return hash >>> 0
}
