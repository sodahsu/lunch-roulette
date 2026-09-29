import type {
  PersonaDefinition,
  PersonaKey,
  Question,
  QuestionCategory,
} from './types'

export const PERSONAS: Record<PersonaKey, PersonaDefinition> = {
  peacekeeper: { key: 'peacekeeper', emoji: '🦦', name: '和平飯友', tagline: '吃什麼都可以，拜託不要再討論了。' },
  contrarian: { key: 'contrarian', emoji: '🐺', name: '逆風美食家', tagline: '大家往東，我偏偏往西。' },
  picky: { key: 'picky', emoji: '🐈', name: '挑食王', tagline: '不是我難搞，是選項真的不行。' },
  adventurer: { key: 'adventurer', emoji: '🦊', name: '新店敢死隊', tagline: 'Google 評論只有三則？走啊。' },
  valueHunter: { key: 'valueHunter', emoji: '🐿️', name: 'CP 值守門員', tagline: '不是不能吃貴，是要值得。' },
  homebody: { key: 'homebody', emoji: '🐢', name: '五百公尺極限派', tagline: '超過兩個路口，就是遠。' },
  foodFanatic: { key: 'foodFanatic', emoji: '🐻', name: '美食狂熱者', tagline: '好吃的話，排四十分鐘也可以。' },
  easygoing: { key: 'easygoing', emoji: '🐶', name: '真・都可以', tagline: '傳說中的真的都可以。' },
}

export const PERSONA_PRIORITY: PersonaKey[] = [
  'easygoing',
  'foodFanatic',
  'adventurer',
  'valueHunter',
  'homebody',
  'contrarian',
  'peacekeeper',
  'picky',
]

export const QUESTION_CATEGORIES: QuestionCategory[] = [
  'alignment',
  'effort',
  'value',
  'adventure',
  'social',
  'identity',
]

export const SESSION_QUESTION_COUNT = 12

export const QUESTION_BANK: Question[] = [
  {
    id: 'group-choice',
    category: 'alignment',
    prompt: '大家都想吃火鍋，但你昨天才吃。你會？',
    required: true,
    options: [
      { id: 'follow', label: '算了，配合大家', emoji: '🫡', scores: { peacekeeper: 3, easygoing: 2 } },
      { id: 'refuse', label: '不行，今天真的不要', emoji: '🙅', scores: { contrarian: 2, picky: 2 } },
    ],
  },
  {
    id: 'you-decide',
    category: 'alignment',
    prompt: '朋友說「我都可以」，你提三家他否決三家。',
    required: true,
    options: [
      { id: 'continue', label: '好，我再想一家', emoji: '😇', scores: { peacekeeper: 2, easygoing: 2 } },
      { id: 'decide', label: '手機給你，你選', emoji: '📱', scores: { contrarian: 1, picky: 2 } },
    ],
  },
  {
    id: 'seven-one',
    category: 'alignment',
    prompt: '7 個人都同意，只有你真的不想吃。',
    required: true,
    options: [
      { id: 'majority', label: '民主萬歲，我跟', emoji: '🕊️', scores: { peacekeeper: 2, easygoing: 3 } },
      { id: 'one-vote', label: '一票也是票', emoji: '🐺', scores: { contrarian: 3, picky: 1 } },
    ],
  },
  {
    id: 'discussion-stuck',
    category: 'alignment',
    prompt: '已經討論 20 分鐘還沒決定。',
    required: true,
    options: [
      { id: 'wait-more', label: '再陪大家討論一下', emoji: '🙂', scores: { peacekeeper: 3, easygoing: 1 } },
      { id: 'declare', label: '我現在直接指定一家', emoji: '📣', scores: { contrarian: 2, picky: 1 } },
    ],
  },

  {
    id: 'queue',
    category: 'effort',
    prompt: '有一家超好吃，但要排 40 分鐘。',
    required: true,
    options: [
      { id: 'wait', label: '排！值得', emoji: '🔥', scores: { foodFanatic: 3, adventurer: 1 } },
      { id: 'leave', label: '下一家謝謝', emoji: '🏃', scores: { homebody: 2, valueHunter: 1 } },
    ],
  },
  {
    id: 'distance',
    category: 'effort',
    prompt: '樓下 3.9 星，走 10 分鐘有 4.8 星。',
    required: true,
    options: [
      { id: 'downstairs', label: '樓下就好', emoji: '🛋️', scores: { homebody: 3, easygoing: 1 } },
      { id: 'walk', label: '走 10 分鐘值得', emoji: '🚶', scores: { foodFanatic: 2, adventurer: 1 } },
    ],
  },
  {
    id: 'long-walk',
    category: 'effort',
    prompt: '要走 18 分鐘，但朋友保證「真的超好吃」。',
    required: true,
    options: [
      { id: 'worth-it', label: '18 分鐘而已，走', emoji: '🥾', scores: { foodFanatic: 2, adventurer: 2 } },
      { id: 'too-far', label: '18 分鐘已經是旅行', emoji: '🐢', scores: { homebody: 3 } },
    ],
  },
  {
    id: 'rain',
    category: 'effort',
    prompt: '外面突然下大雨，但想吃的店在 600 公尺外。',
    required: true,
    options: [
      { id: 'umbrella', label: '撐傘照去', emoji: '☔', scores: { foodFanatic: 2, adventurer: 1 } },
      { id: 'nearby', label: '最近的店突然都變好吃了', emoji: '🏠', scores: { homebody: 3, easygoing: 1 } },
    ],
  },

  {
    id: 'budget',
    category: 'value',
    prompt: '普通但 $250，或真的好吃但 $500？',
    required: true,
    options: [
      { id: 'cheap', label: '$250 就好', emoji: '💰', scores: { valueHunter: 3 } },
      { id: 'great', label: '$500，好吃比較重要', emoji: '✨', scores: { foodFanatic: 2, adventurer: 1 } },
    ],
  },
  {
    id: 'group-price',
    category: 'value',
    prompt: '大家突然說今天要吃一人 $1,200。',
    required: true,
    options: [
      { id: 'occasionally', label: '偶爾可以啦', emoji: '💳', scores: { foodFanatic: 2, easygoing: 1 } },
      { id: 'too-much', label: '你們剛剛不是說隨便吃嗎', emoji: '🚨', scores: { valueHunter: 3, contrarian: 1 } },
    ],
  },
  {
    id: 'signature-dish',
    category: 'value',
    prompt: '有一道很貴的招牌菜，大家說「點來分啦」。',
    required: true,
    options: [
      { id: 'order', label: '點啊，來都來了', emoji: '🍖', scores: { foodFanatic: 2, adventurer: 1, easygoing: 1 } },
      { id: 'calculate', label: '先算一下每個人多少', emoji: '🧮', scores: { valueHunter: 3 } },
    ],
  },
  {
    id: 'aa-bill',
    category: 'value',
    prompt: '朋友說 AA，結果他一個人點了全桌最貴的。',
    required: true,
    options: [
      { id: 'let-go', label: '算了，這次就這樣', emoji: '🙂', scores: { peacekeeper: 2, easygoing: 2 } },
      { id: 'remember', label: '我會記得這件事', emoji: '👁️', scores: { valueHunter: 2, picky: 1 } },
    ],
  },

  {
    id: 'new-place',
    category: 'adventure',
    prompt: '新開的店只有 3 則評論，朋友說想試。',
    required: true,
    options: [
      { id: 'go', label: '走啊，現在就去', emoji: '🎲', scores: { adventurer: 3, foodFanatic: 1 } },
      { id: 'safe', label: '先不要拿晚餐冒險', emoji: '🛡️', scores: { picky: 2, valueHunter: 1 } },
    ],
  },
  {
    id: 'mystery-dish',
    category: 'adventure',
    prompt: '菜單上有一道你完全看不懂是什麼。',
    required: true,
    options: [
      { id: 'order-blind', label: '就是它了', emoji: '🤩', scores: { adventurer: 3 } },
      { id: 'search-first', label: '先 Google 再說', emoji: '🔎', scores: { picky: 2, valueHunter: 1 } },
    ],
  },
  {
    id: 'hidden-menu',
    category: 'adventure',
    prompt: '老闆小聲說：「今天有隱藏料理。」',
    required: true,
    options: [
      { id: 'secret', label: '不用解釋，來一份', emoji: '🔥', scores: { adventurer: 3, foodFanatic: 2 } },
      { id: 'menu-only', label: '我想先知道那到底是什麼', emoji: '🤨', scores: { picky: 2 } },
    ],
  },
  {
    id: 'shabby-gem',
    category: 'adventure',
    prompt: '店看起來很破，但 Google 評論 4.9。',
    required: true,
    options: [
      { id: 'trust-rating', label: '這種通常才是神店', emoji: '🥹', scores: { adventurer: 2, foodFanatic: 2 } },
      { id: 'trust-eyes', label: '我先相信我的眼睛', emoji: '🧼', scores: { picky: 2, homebody: 1 } },
    ],
  },

  {
    id: 'last-bite',
    category: 'social',
    prompt: '桌上剩最後一口，而且大家都沒動。',
    required: true,
    options: [
      { id: 'ask', label: '先問：「有人要嗎？」', emoji: '🙂', scores: { peacekeeper: 2, easygoing: 1 } },
      { id: 'eat', label: '三秒沒人動，我吃', emoji: '😎', scores: { adventurer: 1, contrarian: 1 } },
    ],
  },
  {
    id: 'wrong-dish',
    category: 'social',
    prompt: '店員上錯菜，但那盤看起來超好吃。',
    required: true,
    options: [
      { id: 'tell-staff', label: '先跟店員說', emoji: '🙋', scores: { peacekeeper: 2, easygoing: 1 } },
      { id: 'tempted', label: '先不要動，我需要掙扎一下', emoji: '😈', scores: { adventurer: 1, foodFanatic: 2 } },
    ],
  },
  {
    id: 'chatty-owner',
    category: 'social',
    prompt: '店很好吃，但老闆會一直坐下來跟你聊天。',
    required: true,
    options: [
      { id: 'human-touch', label: '很有人情味啊', emoji: '🥰', scores: { easygoing: 2, peacekeeper: 1 } },
      { id: 'just-eat', label: '我真的只是來吃飯', emoji: '😨', scores: { homebody: 1, picky: 2 } },
    ],
  },
  {
    id: 'bad-chair',
    category: 'social',
    prompt: '餐廳超好吃，但椅子難坐到像在受刑。',
    required: true,
    options: [
      { id: 'mouth-first', label: '嘴巴開心就好', emoji: '🍜', scores: { foodFanatic: 3 } },
      { id: 'body-rights', label: '屁股也有人權', emoji: '🪑', scores: { homebody: 2, picky: 1 } },
    ],
  },

  {
    id: 'self-image',
    category: 'identity',
    prompt: '你覺得自己算好約的人嗎？',
    required: true,
    options: [
      { id: 'very', label: '超好約', emoji: '😇', scores: { easygoing: 3 } },
      { id: 'depends', label: '看情況啦', emoji: '😏', scores: { picky: 1, contrarian: 1 } },
    ],
  },
  {
    id: 'blame',
    category: 'identity',
    prompt: '聚餐最後卡住，通常你覺得問題出在？',
    required: true,
    options: [
      { id: 'others', label: '通常是別人', emoji: '🧑‍🤝‍🧑', scores: { contrarian: 1, picky: 2 } },
      { id: 'maybe-me', label: '好啦，可能有一點是我', emoji: '🪞', scores: { easygoing: 2, peacekeeper: 1 } },
    ],
  },
  {
    id: 'say-anything',
    category: 'identity',
    prompt: '你說「都可以」的時候，是真的都可以嗎？',
    required: true,
    options: [
      { id: 'honest', label: '真的，我沒差', emoji: '👼', scores: { easygoing: 3, peacekeeper: 1 } },
      { id: 'secret-answer', label: '其實心裡有一個答案', emoji: '🤥', scores: { picky: 2, contrarian: 1 } },
    ],
  },
  {
    id: 'remember-it',
    category: 'identity',
    prompt: '最後真的吃到你不想吃的，你會？',
    required: true,
    options: [
      { id: 'fine', label: '也可以啦，吃就吃', emoji: '🙂', scores: { easygoing: 3, peacekeeper: 1 } },
      { id: 'keep-score', label: '表面沒事，但我會記得', emoji: '😶', scores: { picky: 2, valueHunter: 1 } },
    ],
  },
]

function hashText(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function sortBySeed(questions: Question[], seed: string): Question[] {
  return [...questions].sort((a, b) => {
    const aHash = hashText(`${seed}:${a.id}`)
    const bHash = hashText(`${seed}:${b.id}`)
    if (aHash !== bHash) return aHash - bHash
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}

export function selectQuestionsForSession(code: string): Question[] {
  const normalizedCode = code.trim().toUpperCase()

  const selected = QUESTION_CATEGORIES.flatMap((category) => {
    const categoryQuestions = QUESTION_BANK.filter((question) => question.category === category)

    if (category === 'identity') {
      const selfImage = categoryQuestions.find((question) => question.id === 'self-image')
      const others = sortBySeed(
        categoryQuestions.filter((question) => question.id !== 'self-image'),
        `${normalizedCode}:${category}`,
      )
      return selfImage ? [selfImage, ...others.slice(0, 1)] : others.slice(0, 2)
    }

    return sortBySeed(categoryQuestions, `${normalizedCode}:${category}`).slice(0, 2)
  })

  return sortBySeed(selected, `${normalizedCode}:order`).slice(0, SESSION_QUESTION_COUNT)
}

// Compatibility alias for non-session-specific utilities and older imports.
// Session runtime code should use selectQuestionsForSession(session.code).
export const QUESTIONS = QUESTION_BANK
