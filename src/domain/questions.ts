import type { PersonaDefinition, PersonaKey, Question } from './types'

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

export const QUESTIONS: Question[] = [
  {
    id: 'group-choice',
    prompt: '大家都想吃火鍋，但你昨天才吃。你會？',
    required: true,
    options: [
      { id: 'follow', label: '算了，配合大家', emoji: '🫡', scores: { peacekeeper: 3, easygoing: 2 } },
      { id: 'refuse', label: '不行，今天真的不要', emoji: '🙅', scores: { contrarian: 2, picky: 2 } },
    ],
  },
  {
    id: 'queue',
    prompt: '有一家超好吃，但要排 40 分鐘。',
    required: true,
    options: [
      { id: 'wait', label: '排！值得', emoji: '🔥', scores: { foodFanatic: 3, adventurer: 1 } },
      { id: 'leave', label: '下一家謝謝', emoji: '🏃', scores: { homebody: 2, valueHunter: 1 } },
    ],
  },
  {
    id: 'new-place',
    prompt: '新開的店只有 3 則評論，朋友說想試。',
    required: true,
    options: [
      { id: 'go', label: '走啊，現在就去', emoji: '🎲', scores: { adventurer: 3, foodFanatic: 1 } },
      { id: 'safe', label: '先不要拿晚餐冒險', emoji: '🛡️', scores: { picky: 2, valueHunter: 1 } },
    ],
  },
  {
    id: 'budget',
    prompt: '普通但 $250，或真的好吃但 $500？',
    required: true,
    options: [
      { id: 'cheap', label: '$250 就好', emoji: '💰', scores: { valueHunter: 3 } },
      { id: 'great', label: '$500，好吃比較重要', emoji: '✨', scores: { foodFanatic: 2, adventurer: 1 } },
    ],
  },
  {
    id: 'distance',
    prompt: '樓下 3.9 星，走 10 分鐘有 4.8 星。',
    required: true,
    options: [
      { id: 'downstairs', label: '樓下就好', emoji: '🛋️', scores: { homebody: 3, easygoing: 1 } },
      { id: 'walk', label: '走 10 分鐘值得', emoji: '🚶', scores: { foodFanatic: 2, adventurer: 1 } },
    ],
  },
  {
    id: 'you-decide',
    prompt: '朋友說「我都可以」，你提三家他否決三家。',
    required: true,
    options: [
      { id: 'continue', label: '好，我再想一家', emoji: '😇', scores: { peacekeeper: 2, easygoing: 2 } },
      { id: 'decide', label: '換你決定，謝謝', emoji: '👑', scores: { contrarian: 1, picky: 2 } },
    ],
  },
  {
    id: 'last-bite',
    prompt: '桌上剩最後一口，而且大家都沒動。',
    required: true,
    options: [
      { id: 'ask', label: '先問：「有人要嗎？」', emoji: '🙂', scores: { peacekeeper: 2, easygoing: 1 } },
      { id: 'eat', label: '三秒沒人動，我吃', emoji: '😎', scores: { adventurer: 1, contrarian: 1 } },
    ],
  },
  {
    id: 'self-image',
    prompt: '你覺得自己算好約的人嗎？',
    required: true,
    options: [
      { id: 'very', label: '超好約', emoji: '😇', scores: { easygoing: 3 } },
      { id: 'depends', label: '看情況啦', emoji: '😏', scores: { picky: 1, contrarian: 1 } },
    ],
  },
]
