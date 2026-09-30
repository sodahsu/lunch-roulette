import type { GroupQuestionStat, ResponseRecord } from './types'

export interface FoodOption {
  id: string
  label: string
  emoji: string
}

// 以「排除」而非「接受」收集：沒勾 = 能吃，全組都沒排除的類別才算共識
export const FOOD_OPTIONS: FoodOption[] = [
  { id: 'hotpot', label: '火鍋', emoji: '🍲' },
  { id: 'bbq', label: '燒肉／燒烤', emoji: '🥩' },
  { id: 'japanese', label: '日式', emoji: '🍣' },
  { id: 'korean', label: '韓式', emoji: '🥘' },
  { id: 'thai', label: '泰式／南洋', emoji: '🍛' },
  { id: 'italian', label: '義式', emoji: '🍝' },
  { id: 'american', label: '美式漢堡', emoji: '🍔' },
  { id: 'noodles', label: '麵食', emoji: '🍜' },
  { id: 'rice-box', label: '便當／定食', emoji: '🍱' },
  { id: 'dumpling', label: '港式／飲茶', emoji: '🥟' },
  { id: 'vegetarian', label: '素食', emoji: '🥗' },
  { id: 'spicy', label: '重辣', emoji: '🌶️' },
]

// 存進 answers 與 group_stats 用的固定 key；不屬於題庫，所以不進計分與相似度
export const FOOD_AVOID_ID = 'food-avoid'
// 明確表示「沒有任何忌口」，用來和「還沒回答」區分
export const FOOD_AVOID_NONE = 'none'

const FOOD_IDS = new Set(FOOD_OPTIONS.map((food) => food.id))

export function encodeFoodAvoid(selected: string[]): string {
  const valid = FOOD_OPTIONS.filter((food) => selected.includes(food.id)).map((food) => food.id)
  return valid.length === 0 ? FOOD_AVOID_NONE : valid.join(',')
}

// undefined 代表沒回答過（舊場次或還沒填）；與「沒有忌口」是不同狀態
export function decodeFoodAvoid(value: string | undefined): string[] | undefined {
  if (value === undefined || value === '') return undefined
  if (value === FOOD_AVOID_NONE) return []
  return value.split(',').filter((id) => FOOD_IDS.has(id))
}

// 只存各類別被幾個人排除，不存是誰排除的
export function calculateFoodAvoidStat(responses: ResponseRecord[]): GroupQuestionStat | null {
  const answered = responses
    .filter((response) => response.is_complete)
    .map((response) => decodeFoodAvoid(response.answers[FOOD_AVOID_ID]))
    .filter((avoid): avoid is string[] => avoid !== undefined)

  if (answered.length === 0) return null

  const counts: Record<string, number> = {}
  for (const avoid of answered) {
    for (const id of avoid) counts[id] = (counts[id] ?? 0) + 1
  }
  return { questionId: FOOD_AVOID_ID, counts, sampleSize: answered.length }
}

export interface FoodConsensus {
  // 全員都沒排除
  safe: FoodOption[]
  // safe 為空時的退路：被排除人數最少的類別，附人數
  leastVetoed: { food: FoodOption; vetoCount: number }[]
  sampleSize: number
}

export function calculateFoodConsensus(stat: GroupQuestionStat | null | undefined): FoodConsensus | null {
  if (!stat || stat.sampleSize === 0) return null

  const vetoCount = (food: FoodOption) => stat.counts[food.id] ?? 0
  const safe = FOOD_OPTIONS.filter((food) => vetoCount(food) === 0)
  if (safe.length > 0) return { safe, leastVetoed: [], sampleSize: stat.sampleSize }

  const min = Math.min(...FOOD_OPTIONS.map(vetoCount))
  const leastVetoed = FOOD_OPTIONS
    .filter((food) => vetoCount(food) === min)
    .map((food) => ({ food, vetoCount: min }))
  return { safe: [], leastVetoed, sampleSize: stat.sampleSize }
}
