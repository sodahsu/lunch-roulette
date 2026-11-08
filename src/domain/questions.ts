import { hashFnv1a } from './hash'
import type {
  PersonaDefinition,
  PersonaKey,
  Question,
  QuestionCategory,
} from './types'

export const PERSONAS: Record<PersonaKey, PersonaDefinition> = {
  peacekeeper: { key: 'peacekeeper', emoji: '🐻‍❄️', name: '和平飯友', tagline: '碗在空中飛，我心如止水，吃什麼都可以。' },
  contrarian: { key: 'contrarian', emoji: '🐺', name: '逆風美食家', tagline: '大家吃火鍋，我端著沙拉逆風而行。' },
  picky: { key: 'picky', emoji: '🐈', name: '挑食王', tagline: '朕看過菜單了，全部退下。' },
  adventurer: { key: 'adventurer', emoji: '🐧', name: '新店敢死隊', tagline: 'Google 評論只有三則？旗子我都插好了。' },
  valueHunter: { key: 'valueHunter', emoji: '🦉', name: 'CP 值守門員', tagline: '先讓我按一下計算機，再決定要不要愛你。' },
  homebody: { key: 'homebody', emoji: '🦥', name: '五百公尺極限派', tagline: '超過兩個路口就是遠征，我選擇躺著等外送。' },
  foodFanatic: { key: 'foodFanatic', emoji: '🐯', name: '美食狂熱者', tagline: '排四十分鐘？我已經在店門口吼了。' },
  easygoing: { key: 'easygoing', emoji: '🐰', name: '真・都可以', tagline: '我真的都可以，兔兔發誓，不騙你。' },
  glutton: { key: 'glutton', emoji: '🦊', name: '全都要選手', tagline: '菜單上的我全都要，誰付錢等一下再說。' },
  orderCaptain: { key: 'orderCaptain', emoji: '🐼', name: '點菜總管', tagline: '桌上我來排，誰敢亂動我的蒸籠。' },
}

// 同分時的排序：越前面越優先；新人格放後段，必須真的分數較高才會勝出
export const PERSONA_PRIORITY: PersonaKey[] = [
  'easygoing',
  'foodFanatic',
  'adventurer',
  'valueHunter',
  'homebody',
  'contrarian',
  'peacekeeper',
  'glutton',
  'orderCaptain',
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

// 新場次使用的問卷版本；舊場次由資料庫的 questionnaire_version 決定，不跟著這個常數走
export const CURRENT_QUESTIONNAIRE_VERSION = 'v0.3'

/**
 * 答題過程中的節奏事件觸發題號（1-indexed），由題數推導，改題數時節奏跟著走：
 * - MINORITY_DETECTED：1/3 進度，場面觀察
 * - CONSENSUS_COLLAPSING：2/3 進度，中場警報
 * - FINAL_TWO：倒數第二題，文案寫「最後兩題」
 */
export const QUIZ_PACING_QUESTION_NUMBERS = {
  MINORITY_DETECTED: Math.round(SESSION_QUESTION_COUNT / 3),
  CONSENSUS_COLLAPSING: Math.round((SESSION_QUESTION_COUNT * 2) / 3),
  FINAL_TWO: SESSION_QUESTION_COUNT - 1,
} as const

const LEGACY_V01_QUESTION_IDS = [
  'group-choice',
  'queue',
  'new-place',
  'budget',
  'distance',
  'you-decide',
  'last-bite',
  'self-image',
]

// v0.2 題庫：已有進行中與歷史房間在用，題目、選項、配分、id 與順序一律凍結；要改題請新增版本
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
      { id: 'majority', label: '民主萬歲，我跟', emoji: '🕊️', scores: { peacekeeper: 2, easygoing: 3, orderCaptain: 1 } },
      { id: 'one-vote', label: '一票也是票', emoji: '🐺', scores: { contrarian: 3, picky: 1 } },
    ],
  },
  {
    id: 'discussion-stuck',
    category: 'alignment',
    prompt: '已經討論 20 分鐘還沒決定。',
    required: true,
    options: [
      { id: 'wait-more', label: '再陪大家討論一下', emoji: '🙂', scores: { peacekeeper: 3, easygoing: 1, orderCaptain: 1 } },
      { id: 'declare', label: '我現在直接指定一家', emoji: '📣', scores: { contrarian: 2, picky: 1, orderCaptain: 3 } },
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
      { id: 'worth-it', label: '18 分鐘而已，走', emoji: '🥾', scores: { foodFanatic: 2, adventurer: 2, glutton: 1 } },
      { id: 'too-far', label: '18 分鐘已經是旅行', emoji: '🐢', scores: { homebody: 3 } },
    ],
  },
  {
    id: 'rain',
    category: 'effort',
    prompt: '外面突然下大雨，但想吃的店在 600 公尺外。',
    required: true,
    options: [
      { id: 'umbrella', label: '撐傘照去', emoji: '☔', scores: { foodFanatic: 2, adventurer: 1, glutton: 1 } },
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
      { id: 'occasionally', label: '偶爾可以啦', emoji: '💳', scores: { foodFanatic: 2, easygoing: 1, glutton: 3 } },
      { id: 'too-much', label: '你們剛剛不是說隨便吃嗎', emoji: '🚨', scores: { valueHunter: 3, contrarian: 1 } },
    ],
  },
  {
    id: 'signature-dish',
    category: 'value',
    prompt: '有一道很貴的招牌菜，大家說「點來分啦」。',
    required: true,
    options: [
      { id: 'order', label: '點啊，來都來了', emoji: '🍖', scores: { foodFanatic: 2, adventurer: 1, easygoing: 1, glutton: 3, orderCaptain: 1 } },
      { id: 'calculate', label: '先算一下每個人多少', emoji: '🧮', scores: { valueHunter: 3 } },
    ],
  },
  {
    id: 'aa-bill',
    category: 'value',
    prompt: '朋友說 AA，結果他一個人點了全桌最貴的。',
    required: true,
    options: [
      { id: 'let-go', label: '算了，這次就這樣', emoji: '🙂', scores: { peacekeeper: 2, easygoing: 2, orderCaptain: 2 } },
      { id: 'remember', label: '我會記得這件事', emoji: '👁️', scores: { valueHunter: 2, picky: 1, orderCaptain: 1 } },
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
      { id: 'order-blind', label: '就是它了', emoji: '🤩', scores: { adventurer: 3, glutton: 2 } },
      { id: 'search-first', label: '先 Google 再說', emoji: '🔎', scores: { picky: 2, valueHunter: 1 } },
    ],
  },
  {
    id: 'hidden-menu',
    category: 'adventure',
    prompt: '老闆小聲說：「今天有隱藏料理。」',
    required: true,
    options: [
      { id: 'secret', label: '不用解釋，來一份', emoji: '🔥', scores: { adventurer: 3, foodFanatic: 2, glutton: 2 } },
      { id: 'menu-only', label: '我想先知道那到底是什麼', emoji: '🤨', scores: { picky: 2 } },
    ],
  },
  {
    id: 'shabby-gem',
    category: 'adventure',
    prompt: '店看起來很破，但 Google 評論 4.9。',
    required: true,
    options: [
      { id: 'trust-rating', label: '這種通常才是神店', emoji: '🥹', scores: { adventurer: 2, foodFanatic: 2, glutton: 1 } },
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
      { id: 'tell-staff', label: '先跟店員說', emoji: '🙋', scores: { peacekeeper: 2, easygoing: 1, orderCaptain: 2 } },
      { id: 'tempted', label: '先不要動，我需要掙扎一下', emoji: '😈', scores: { adventurer: 1, foodFanatic: 2, glutton: 3 } },
    ],
  },
  {
    id: 'chatty-owner',
    category: 'social',
    prompt: '店很好吃，但老闆會一直坐下來跟你聊天。',
    required: true,
    options: [
      { id: 'human-touch', label: '很有人情味啊', emoji: '🥰', scores: { easygoing: 2, peacekeeper: 1, orderCaptain: 2 } },
      { id: 'just-eat', label: '我真的只是來吃飯', emoji: '😨', scores: { homebody: 1, picky: 2 } },
    ],
  },
  {
    id: 'bad-chair',
    category: 'social',
    prompt: '餐廳超好吃，但椅子難坐到像在受刑。',
    required: true,
    options: [
      { id: 'mouth-first', label: '嘴巴開心就好', emoji: '🍜', scores: { foodFanatic: 3, glutton: 2 } },
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
      { id: 'maybe-me', label: '好啦，可能有一點是我', emoji: '🪞', scores: { easygoing: 2, peacekeeper: 1, orderCaptain: 2 } },
    ],
  },
  {
    id: 'say-anything',
    category: 'identity',
    prompt: '你說「都可以」的時候，是真的都可以嗎？',
    required: true,
    options: [
      { id: 'honest', label: '真的，我沒差', emoji: '👼', scores: { easygoing: 3, peacekeeper: 1, orderCaptain: 1 } },
      { id: 'secret-answer', label: '其實心裡有一個答案', emoji: '🤥', scores: { picky: 2, contrarian: 1 } },
    ],
  },
  {
    id: 'remember-it',
    category: 'identity',
    prompt: '最後真的吃到你不想吃的，你會？',
    required: true,
    options: [
      { id: 'fine', label: '也可以啦，吃就吃', emoji: '🙂', scores: { easygoing: 3, peacekeeper: 1, orderCaptain: 1 } },
      { id: 'keep-score', label: '表面沒事，但我會記得', emoji: '😶', scores: { picky: 2, valueHunter: 1 } },
    ],
  },
]

// v0.3 題庫：每類 8 題、共 48 題。前 24 題沿用 v0.2 的題目文案並重配分，其餘 24 題為新增。
// 人格以「得分 ÷ 該房可得最高分」的達成率比較，所以配分刻意讓十種人格出現次數與總分接近，
// 並把立場相反的人格放在相反的選項；調整任何配分後請跑 BALANCE_REPORT=1 的分布模擬確認沒有失衡。
export const QUESTION_BANK_V03: Question[] = [
  // alignment：配合與拍板
  {
    id: 'group-choice',
    category: 'alignment',
    prompt: '大家都想吃火鍋，但你昨天才吃。你會？',
    required: true,
    options: [
      { id: 'follow', label: '算了，配合大家', emoji: '🫡', scores: { peacekeeper: 3, easygoing: 2, glutton: 1 } },
      { id: 'refuse', label: '不行，今天真的不要', emoji: '🙅', scores: { contrarian: 2, picky: 2, adventurer: 1 } },
    ],
  },
  {
    id: 'you-decide',
    category: 'alignment',
    prompt: '朋友說「我都可以」，你提三家他否決三家。',
    required: true,
    options: [
      { id: 'continue', label: '好，我再想一家', emoji: '😇', scores: { orderCaptain: 2, peacekeeper: 1, adventurer: 1 } },
      { id: 'decide', label: '手機給你，你選', emoji: '📱', scores: { picky: 2, contrarian: 1, homebody: 1 } },
    ],
  },
  {
    id: 'seven-one',
    category: 'alignment',
    prompt: '7 個人都同意，只有你真的不想吃。',
    required: true,
    options: [
      { id: 'majority', label: '民主萬歲，我跟', emoji: '🕊️', scores: { easygoing: 3, peacekeeper: 2, homebody: 1 } },
      { id: 'one-vote', label: '一票也是票', emoji: '🐺', scores: { contrarian: 3, foodFanatic: 1 } },
    ],
  },
  {
    id: 'discussion-stuck',
    category: 'alignment',
    prompt: '已經討論 20 分鐘還沒決定。',
    required: true,
    options: [
      { id: 'wait-more', label: '再陪大家討論一下', emoji: '🙂', scores: { peacekeeper: 3, easygoing: 1 } },
      { id: 'declare', label: '我現在直接指定一家', emoji: '📣', scores: { orderCaptain: 3, contrarian: 1, foodFanatic: 1 } },
    ],
  },
  {
    id: 'tie-vote',
    category: 'alignment',
    prompt: '投票 4 比 4 平手，所有人都看著你。',
    required: true,
    options: [
      { id: 'coin-flip', label: '丟硬幣吧，反正都行', emoji: '🪙', scores: { easygoing: 3, adventurer: 1, homebody: 1 } },
      { id: 'pros-cons', label: '我來列優缺點，直接拍板', emoji: '📋', scores: { orderCaptain: 3, valueHunter: 2 } },
    ],
  },
  {
    id: 'asked-twice',
    category: 'alignment',
    prompt: '朋友第三次問你：「所以到底想吃什麼？」',
    required: true,
    options: [
      { id: 'no-idea', label: '真的想不到，你們決定', emoji: '😶', scores: { easygoing: 2, homebody: 2 } },
      { id: 'has-list', label: '其實我心裡早就有三家', emoji: '💡', scores: { foodFanatic: 2, picky: 2, orderCaptain: 1, valueHunter: 1 } },
    ],
  },
  {
    id: 'pay-deposit',
    category: 'alignment',
    prompt: '想吃的店要先付每人 $200 訂金才能訂位。',
    required: true,
    options: [
      { id: 'pay', label: '我先付，晚點再跟大家收', emoji: '💸', scores: { orderCaptain: 2, foodFanatic: 2, peacekeeper: 1 } },
      { id: 'no-deposit', label: '那不訂了，現場碰運氣', emoji: '🙅', scores: { valueHunter: 3, adventurer: 1, homebody: 1, contrarian: 1 } },
    ],
  },
  {
    id: 'veto-salad',
    category: 'alignment',
    prompt: '大家一致想吃炸雞，但你今天只想吃沙拉。',
    required: true,
    options: [
      { id: 'salad', label: '我點沙拉，坐旁邊看你們吃', emoji: '🥗', scores: { contrarian: 3, valueHunter: 1 } },
      { id: 'fried', label: '沙拉明天吃，今天炸雞萬歲', emoji: '🍗', scores: { glutton: 2, peacekeeper: 1 } },
    ],
  },

  // effort：願意為一頓飯付出多少力氣
  {
    id: 'queue',
    category: 'effort',
    prompt: '有一家超好吃，但要排 40 分鐘。',
    required: true,
    options: [
      { id: 'wait', label: '排！值得', emoji: '🔥', scores: { foodFanatic: 3, adventurer: 1, orderCaptain: 1 } },
      { id: 'leave', label: '下一家謝謝', emoji: '🏃', scores: { homebody: 2, valueHunter: 2 } },
    ],
  },
  {
    id: 'distance',
    category: 'effort',
    prompt: '樓下 3.9 星，走 10 分鐘有 4.8 星。',
    required: true,
    options: [
      { id: 'downstairs', label: '樓下就好', emoji: '🛋️', scores: { homebody: 3, easygoing: 1, valueHunter: 1 } },
      { id: 'walk', label: '走 10 分鐘值得', emoji: '🚶', scores: { foodFanatic: 2, picky: 2, orderCaptain: 1 } },
    ],
  },
  {
    id: 'long-walk',
    category: 'effort',
    prompt: '要走 18 分鐘，但朋友保證「真的超好吃」。',
    required: true,
    options: [
      { id: 'worth-it', label: '18 分鐘而已，走', emoji: '🥾', scores: { adventurer: 2, peacekeeper: 2, glutton: 1 } },
      { id: 'too-far', label: '18 分鐘已經是旅行', emoji: '🐢', scores: { homebody: 3, contrarian: 1 } },
    ],
  },
  {
    id: 'rain',
    category: 'effort',
    prompt: '外面突然下大雨，但想吃的店在 600 公尺外。',
    required: true,
    options: [
      { id: 'umbrella', label: '撐傘照去', emoji: '☔', scores: { foodFanatic: 2, glutton: 1, orderCaptain: 1 } },
      { id: 'nearby', label: '最近的店突然都變好吃了', emoji: '🏠', scores: { homebody: 2, easygoing: 1 } },
    ],
  },
  {
    id: 'delivery-fee',
    category: 'effort',
    prompt: '外送要運費 $60，自己走去買只要 5 分鐘。',
    required: true,
    options: [
      { id: 'walk-it', label: '走去買，運費可以多買半份雞排', emoji: '🚶', scores: { valueHunter: 3, picky: 1 } },
      { id: 'deliver', label: '外送啦，順便多點兩樣', emoji: '🛵', scores: { glutton: 2, homebody: 2, easygoing: 1 } },
    ],
  },
  {
    id: 'reservation-hard',
    category: 'effort',
    prompt: '想吃的那家要提前一週訂位。',
    required: true,
    options: [
      { id: 'plan-ahead', label: '訂！我來排時間', emoji: '📅', scores: { orderCaptain: 3, foodFanatic: 2, peacekeeper: 1 } },
      { id: 'walk-in', label: '那就當天碰運氣', emoji: '🎲', scores: { adventurer: 2, easygoing: 2, contrarian: 1 } },
    ],
  },
  {
    id: 'cross-town',
    category: 'effort',
    prompt: '朋友說要搭捷運轉兩次，去吃一碗拉麵。',
    required: true,
    options: [
      { id: 'cross-town-go', label: '為了拉麵，轉三次也行', emoji: '🚇', scores: { foodFanatic: 3, adventurer: 1, peacekeeper: 1 } },
      { id: 'ramen-near', label: '我家附近也有拉麵啊', emoji: '🍜', scores: { homebody: 2, valueHunter: 1, picky: 1 } },
    ],
  },
  {
    id: 'snack-first',
    category: 'effort',
    prompt: '排隊要等一小時，朋友提議先去買別的墊肚子。',
    required: true,
    options: [
      { id: 'snack', label: '好啊，順便逛一下', emoji: '🧋', scores: { glutton: 3, adventurer: 1 } },
      { id: 'hold-stomach', label: '不行，肚子要留給主角', emoji: '😤', scores: { foodFanatic: 2, picky: 2, valueHunter: 1, contrarian: 1 } },
    ],
  },

  // value：錢包與 CP 值
  {
    id: 'budget',
    category: 'value',
    prompt: '普通但 $250，或真的好吃但 $500？',
    required: true,
    options: [
      { id: 'cheap', label: '$250 就好', emoji: '💰', scores: { valueHunter: 3, homebody: 1 } },
      { id: 'great', label: '$500，好吃比較重要', emoji: '✨', scores: { foodFanatic: 2, glutton: 1, adventurer: 1 } },
    ],
  },
  {
    id: 'group-price',
    category: 'value',
    prompt: '大家突然說今天要吃一人 $1,200。',
    required: true,
    options: [
      { id: 'occasionally', label: '偶爾可以啦', emoji: '💳', scores: { glutton: 3, foodFanatic: 2, peacekeeper: 1 } },
      { id: 'too-much', label: '你們剛剛不是說隨便吃嗎', emoji: '🚨', scores: { valueHunter: 3, contrarian: 2 } },
    ],
  },
  {
    id: 'signature-dish',
    category: 'value',
    prompt: '有一道很貴的招牌菜，大家說「點來分啦」。',
    required: true,
    options: [
      { id: 'order', label: '點啊，來都來了', emoji: '🍖', scores: { glutton: 3, foodFanatic: 1, orderCaptain: 1, adventurer: 1 } },
      { id: 'calculate', label: '先算一下每個人多少', emoji: '🧮', scores: { valueHunter: 3, picky: 1 } },
    ],
  },
  {
    id: 'aa-bill',
    category: 'value',
    prompt: '朋友說 AA，結果他一個人點了全桌最貴的。',
    required: true,
    options: [
      { id: 'let-go', label: '算了，這次就這樣', emoji: '🙂', scores: { peacekeeper: 3, easygoing: 2 } },
      { id: 'remember', label: '我會記得這件事', emoji: '👁️', scores: { contrarian: 2, picky: 1, orderCaptain: 1 } },
    ],
  },
  {
    id: 'coupon-war',
    category: 'value',
    prompt: '這家「兩人同行一人免費」，但你只想吃一份。',
    required: true,
    options: [
      { id: 'find-partner', label: '我去找人湊，不然多虧', emoji: '🎟️', scores: { valueHunter: 3, orderCaptain: 2 } },
      { id: 'skip-coupon', label: '算了，我吃我的就好', emoji: '😌', scores: { easygoing: 2, homebody: 1 } },
    ],
  },
  {
    id: 'set-meal',
    category: 'value',
    prompt: '套餐 $399 比單點便宜，但裡面只有三樣是你想吃的。',
    required: true,
    options: [
      { id: 'set', label: '點套餐，多的也算賺到', emoji: '🍱', scores: { valueHunter: 2, glutton: 2, adventurer: 1 } },
      { id: 'a-la-carte', label: '我只點我要的三樣', emoji: '🍽️', scores: { picky: 3, contrarian: 1 } },
    ],
  },
  {
    id: 'dessert-add',
    category: 'value',
    prompt: '已經吃飽了，但甜點菜單上有一個限量的。',
    required: true,
    options: [
      { id: 'add-dessert', label: '限量欸，加！', emoji: '🍰', scores: { glutton: 3, foodFanatic: 1, adventurer: 1 } },
      { id: 'already-full', label: '撐了，下次吧', emoji: '🙅', scores: { easygoing: 2, homebody: 1, peacekeeper: 1 } },
    ],
  },
  {
    id: 'exact-split',
    category: 'value',
    prompt: '結帳時有人問：「要不要拆帳拆到小數點？」',
    required: true,
    options: [
      { id: 'exact', label: '拆，我來算，一塊錢都清楚', emoji: '🧾', scores: { orderCaptain: 3, valueHunter: 2 } },
      { id: 'round-up', label: '湊整數啦，不要為難大家', emoji: '🤝', scores: { peacekeeper: 3, easygoing: 1 } },
    ],
  },

  // adventure：面對沒吃過的東西
  {
    id: 'new-place',
    category: 'adventure',
    prompt: '新開的店只有 3 則評論，朋友說想試。',
    required: true,
    options: [
      { id: 'go', label: '走啊，現在就去', emoji: '🎲', scores: { adventurer: 3, foodFanatic: 1, contrarian: 1 } },
      { id: 'safe', label: '先不要拿晚餐冒險', emoji: '🛡️', scores: { picky: 2, valueHunter: 1, homebody: 1 } },
    ],
  },
  {
    id: 'mystery-dish',
    category: 'adventure',
    prompt: '菜單上有一道你完全看不懂是什麼。',
    required: true,
    options: [
      { id: 'order-blind', label: '就是它了', emoji: '🤩', scores: { adventurer: 3, glutton: 2, easygoing: 1 } },
      { id: 'search-first', label: '先 Google 再說', emoji: '🔎', scores: { picky: 2, orderCaptain: 1, valueHunter: 1 } },
    ],
  },
  {
    id: 'hidden-menu',
    category: 'adventure',
    prompt: '老闆小聲說：「今天有隱藏料理。」',
    required: true,
    options: [
      { id: 'secret', label: '不用解釋，來一份', emoji: '🔥', scores: { adventurer: 3, foodFanatic: 2, glutton: 1 } },
      { id: 'menu-only', label: '我想先知道那到底是什麼', emoji: '🤨', scores: { picky: 2, orderCaptain: 1, homebody: 1, valueHunter: 1 } },
    ],
  },
  {
    id: 'shabby-gem',
    category: 'adventure',
    prompt: '店看起來很破，但 Google 評論 4.9。',
    required: true,
    options: [
      { id: 'trust-rating', label: '這種通常才是神店', emoji: '🥹', scores: { foodFanatic: 2, valueHunter: 2 } },
      { id: 'trust-eyes', label: '我先相信我的眼睛', emoji: '🧼', scores: { picky: 2, homebody: 1 } },
    ],
  },
  {
    id: 'chef-pick',
    category: 'adventure',
    prompt: '點到一半，老闆說：「要不要讓我幫你配今天的招牌？」',
    required: true,
    options: [
      { id: 'chef', label: '交給你，我全信', emoji: '👨‍🍳', scores: { easygoing: 2, peacekeeper: 1 } },
      { id: 'own', label: '我自己點，我有計畫', emoji: '📝', scores: { orderCaptain: 2, contrarian: 1 } },
    ],
  },
  {
    id: 'foreign-menu',
    category: 'adventure',
    prompt: '一家外國客人比本地人多的小店，菜單沒有中文。',
    required: true,
    options: [
      { id: 'point-and-pray', label: '隨便指一個，吃吃看', emoji: '👆', scores: { adventurer: 2, contrarian: 1, easygoing: 1 } },
      { id: 'translate-app', label: '先掏出翻譯 App', emoji: '📲', scores: { orderCaptain: 2, valueHunter: 2, homebody: 1 } },
    ],
  },
  {
    id: 'repeat-order',
    category: 'adventure',
    prompt: '你有一家吃了三年的老店，朋友帶你去另一家新的。',
    required: true,
    options: [
      { id: 'loyal', label: '我還是想吃老店', emoji: '🏠', scores: { homebody: 2, picky: 2, valueHunter: 1 } },
      { id: 'try-new', label: '好啊，換個口味', emoji: '🆕', scores: { adventurer: 3, peacekeeper: 1, foodFanatic: 1 } },
    ],
  },
  {
    id: 'spicy-level',
    category: 'adventure',
    prompt: '店員問：「要幾辣？我們最辣是地獄級。」',
    required: true,
    options: [
      { id: 'hell-level', label: '地獄級，來啊', emoji: '🌶️', scores: { foodFanatic: 2, contrarian: 2, glutton: 1, adventurer: 1 } },
      { id: 'mild', label: '小辣就好，我還想活著回家', emoji: '🙂', scores: { peacekeeper: 1, homebody: 1, picky: 1 } },
    ],
  },

  // social：同桌的相處
  {
    id: 'last-bite',
    category: 'social',
    prompt: '桌上剩最後一口，而且大家都沒動。',
    required: true,
    options: [
      { id: 'ask', label: '先問：「有人要嗎？」', emoji: '🙂', scores: { peacekeeper: 2, orderCaptain: 1 } },
      { id: 'eat', label: '三秒沒人動，我吃', emoji: '😎', scores: { glutton: 2, adventurer: 1 } },
    ],
  },
  {
    id: 'wrong-dish',
    category: 'social',
    prompt: '店員上錯菜，但那盤看起來超好吃。',
    required: true,
    options: [
      { id: 'tell-staff', label: '先跟店員說', emoji: '🙋', scores: { peacekeeper: 2, orderCaptain: 2 } },
      { id: 'tempted', label: '先不要動，我需要掙扎一下', emoji: '😈', scores: { glutton: 3, foodFanatic: 1, adventurer: 1 } },
    ],
  },
  {
    id: 'chatty-owner',
    category: 'social',
    prompt: '店很好吃，但老闆會一直坐下來跟你聊天。',
    required: true,
    options: [
      { id: 'human-touch', label: '很有人情味啊', emoji: '🥰', scores: { easygoing: 2, orderCaptain: 2, valueHunter: 1, adventurer: 1 } },
      { id: 'just-eat', label: '我真的只是來吃飯', emoji: '😨', scores: { homebody: 2, picky: 2 } },
    ],
  },
  {
    id: 'bad-chair',
    category: 'social',
    prompt: '餐廳超好吃，但椅子難坐到像在受刑。',
    required: true,
    options: [
      { id: 'mouth-first', label: '嘴巴開心就好', emoji: '🍜', scores: { foodFanatic: 3, glutton: 1 } },
      { id: 'body-rights', label: '屁股也有人權', emoji: '🪑', scores: { homebody: 2, picky: 2, valueHunter: 1 } },
    ],
  },
  {
    id: 'photo-first',
    category: 'social',
    prompt: '菜剛上桌，朋友說：「等一下，我先拍。」',
    required: true,
    options: [
      { id: 'wait-photo', label: '好，我等，順便幫你打光', emoji: '📸', scores: { peacekeeper: 2, orderCaptain: 2, easygoing: 1 } },
      { id: 'eat-hot', label: '熱的先吃，照片是冷的', emoji: '🔥', scores: { foodFanatic: 2, glutton: 2, contrarian: 1 } },
    ],
  },
  {
    id: 'share-plates',
    category: 'social',
    prompt: '朋友習慣把每一道菜都夾一口放你碗裡。',
    required: true,
    options: [
      { id: 'welcome', label: '來啊，分享最快樂', emoji: '🥢', scores: { easygoing: 2, glutton: 2, adventurer: 1 } },
      { id: 'own-bowl', label: '我的碗是結界', emoji: '🥣', scores: { picky: 2, orderCaptain: 2, contrarian: 1, homebody: 1 } },
    ],
  },
  {
    id: 'slow-eater',
    category: 'social',
    prompt: '大家都吃完了，只有你還剩一半，朋友在滑手機。',
    required: true,
    options: [
      { id: 'rush', label: '我吃快一點，不要拖到大家', emoji: '💨', scores: { peacekeeper: 3, valueHunter: 1 } },
      { id: 'own-pace', label: '我付了錢，我要慢慢吃完', emoji: '🐌', scores: { valueHunter: 2, foodFanatic: 2, contrarian: 1 } },
    ],
  },
  {
    id: 'start-eating',
    category: 'social',
    prompt: '圓桌上菜了，大家都不知道誰先動筷子。',
    required: true,
    options: [
      { id: 'start-first', label: '我先開動，大家才好吃', emoji: '🥢', scores: { orderCaptain: 2, glutton: 2, adventurer: 1 } },
      { id: 'wait-host', label: '等主人或長輩先動', emoji: '🙏', scores: { peacekeeper: 3, easygoing: 1, homebody: 1 } },
    ],
  },

  // identity：怎麼看自己（self-image 固定入選，且 very 選項 id 是主持人畫面的統計依據）
  {
    id: 'self-image',
    category: 'identity',
    prompt: '你覺得自己算好約的人嗎？',
    required: true,
    options: [
      { id: 'very', label: '超好約', emoji: '😇', scores: { easygoing: 2, peacekeeper: 1, glutton: 1 } },
      { id: 'depends', label: '看情況啦', emoji: '😏', scores: { picky: 2, contrarian: 1, valueHunter: 1 } },
    ],
  },
  {
    id: 'blame',
    category: 'identity',
    prompt: '聚餐最後卡住，通常你覺得問題出在？',
    required: true,
    options: [
      { id: 'others', label: '通常是別人', emoji: '🧑‍🤝‍🧑', scores: { contrarian: 2 } },
      { id: 'maybe-me', label: '好啦，可能有一點是我', emoji: '🪞', scores: { peacekeeper: 2, orderCaptain: 1 } },
    ],
  },
  {
    id: 'say-anything',
    category: 'identity',
    prompt: '你說「都可以」的時候，是真的都可以嗎？',
    required: true,
    options: [
      { id: 'honest', label: '真的，我沒差', emoji: '👼', scores: { easygoing: 3, peacekeeper: 1 } },
      { id: 'secret-answer', label: '其實心裡有一個答案', emoji: '🤥', scores: { picky: 2, contrarian: 1, foodFanatic: 1 } },
    ],
  },
  {
    id: 'remember-it',
    category: 'identity',
    prompt: '最後真的吃到你不想吃的，你會？',
    required: true,
    options: [
      { id: 'fine', label: '也可以啦，吃就吃', emoji: '🙂', scores: { easygoing: 2, peacekeeper: 1, glutton: 1 } },
      { id: 'keep-score', label: '表面沒事，但我會記得', emoji: '😶', scores: { picky: 2, valueHunter: 1, contrarian: 1 } },
    ],
  },
  {
    id: 'food-first-thought',
    category: 'identity',
    prompt: '週末一早醒來，你的第一個念頭是？',
    required: true,
    options: [
      { id: 'already-hungry', label: '今天要吃什麼', emoji: '🍳', scores: { foodFanatic: 2, glutton: 2, orderCaptain: 1, adventurer: 1 } },
      { id: 'still-sleep', label: '再睡五分鐘，餓了再說', emoji: '🛌', scores: { homebody: 2, easygoing: 1 } },
    ],
  },
  {
    id: 'friend-description',
    category: 'identity',
    prompt: '朋友怎麼形容你的吃飯習慣？',
    required: true,
    options: [
      { id: 'food-hunter', label: '口袋名單最多的那個人', emoji: '🗺️', scores: { foodFanatic: 2, adventurer: 2, orderCaptain: 1 } },
      { id: 'steady-regular', label: '最穩定的固定班底', emoji: '🍚', scores: { homebody: 2, valueHunter: 2, peacekeeper: 1 } },
    ],
  },
  {
    id: 'app-habit',
    category: 'identity',
    prompt: '你手機裡最常打開的是哪個 App？',
    required: true,
    options: [
      { id: 'map-app', label: '地圖，收藏了一百家', emoji: '📍', scores: { adventurer: 2, foodFanatic: 2, orderCaptain: 1 } },
      { id: 'coupon-app', label: '優惠券和比價 App', emoji: '🏷️', scores: { valueHunter: 3, homebody: 1 } },
    ],
  },
  {
    id: 'last-meal',
    category: 'identity',
    prompt: '如果人生只剩最後一餐，你會點？',
    required: true,
    options: [
      { id: 'all-the-things', label: '每樣都來一點', emoji: '🍽️', scores: { glutton: 3, adventurer: 1 } },
      { id: 'one-perfect', label: '一道最完美的就夠', emoji: '🍣', scores: { picky: 2, foodFanatic: 2, contrarian: 1 } },
    ],
  },
]

function sortBySeed(questions: Question[], seed: string): Question[] {
  return [...questions].sort((a, b) => {
    const aHash = hashFnv1a(`${seed}:${a.id}`)
    const bHash = hashFnv1a(`${seed}:${b.id}`)
    if (aHash !== bHash) return aHash - bHash
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}

export function selectQuestionsForSession(
  code: string,
  questionnaireVersion = 'v0.2',
): Question[] {
  if (questionnaireVersion === 'v0.1') {
    return LEGACY_V01_QUESTION_IDS
      .map((id) => QUESTION_BANK.find((question) => question.id === id))
      .filter((question): question is Question => Boolean(question))
  }

  const bank = questionnaireVersion === 'v0.3' ? QUESTION_BANK_V03 : QUESTION_BANK
  const normalizedCode = code.trim().toUpperCase()

  const selected = QUESTION_CATEGORIES.flatMap((category) => {
    const categoryQuestions = bank.filter((question) => question.category === category)

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
// Session runtime code should use selectQuestionsForSession(session.code, session.questionnaire_version).
export const QUESTIONS = QUESTION_BANK
