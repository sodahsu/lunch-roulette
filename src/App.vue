<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import QRCode from 'qrcode'
import PersonaGlyph from './components/PersonaGlyph.vue'
import { avatarFor, personaArt } from './lib/avatars'
import { isAudioMuted, playCue, setAudioMuted, startLobbyLoop, stopLobbyLoop, unlockAudio } from './lib/audio'
import { PERSONAS, selectQuestionsForSession } from './domain/questions'
import { calculateDinnerSuccessRate, RARE_CARD_REASON } from './domain/domain'
import {
  calculateFoodConsensus,
  decodeFoodAvoid,
  encodeFoodAvoid,
  FOOD_AVOID_ID,
  FOOD_OPTIONS,
} from './domain/foods'
import type { GroupQuestionStat, Participant, ParticipantResult, PersonaKey } from './domain/types'
import {
  createSession,
  getSessionByCode,
  getGroupStats,
  getPersonalResult,
  listParticipantResults,
  getOwnParticipant,
  getOwnResponse,
  ensureUserId,
  joinSession,
  listParticipants,
  finalizeReveal,
  lockSession,
  previewLockedGroupStats,
  saveAnswers,
  SessionNotFoundError,
  subscribeToSession,
  type SessionRecord,
} from './lib/session-service'

type Screen = 'landing' | 'join' | 'quiz' | 'food' | 'waiting' | 'host' | 'revealing' | 'result' | 'overview'

type OverviewCard = {
  code: string
  participant: Participant
  result: Pick<ParticipantResult, 'persona' | 'rare' | 'rareReason'> | null
  status: 'complete' | 'incomplete' | 'pending'
}

const PERSONA_DISPLAY: Record<PersonaKey, { code: string; label: string }> = {
  peacekeeper: { code: '01', label: 'PEACEKEEPER' },
  contrarian: { code: '02', label: 'CONTRARIAN' },
  picky: { code: '03', label: 'PICKY EATER' },
  adventurer: { code: '04', label: 'ADVENTURE TYPE' },
  valueHunter: { code: '05', label: 'VALUE HUNTER' },
  homebody: { code: '06', label: 'HOME RADIUS TYPE' },
  foodFanatic: { code: '07', label: 'FOOD FANATIC' },
  easygoing: { code: '08', label: 'TRULY EASYGOING' },
  glutton: { code: '09', label: 'ALL-IN EATER' },
  orderCaptain: { code: '10', label: 'ORDER CAPTAIN' },
}

const initialUrl = new URL(window.location.href)
const hasRoomParam = initialUrl.searchParams.has('room')
const requestedRoomOverview = ref(initialUrl.searchParams.get('view') === 'overview')
const restoringFromUrl = ref(hasRoomParam)
const screen = ref<Screen>('landing')
const busy = ref(false)
const errorMessage = ref('')
const roomCode = ref('')
const name = ref('')
const session = ref<SessionRecord | null>(null)
const participant = ref<Participant | null>(null)
const participants = ref<Participant[]>([])
const completedCount = ref(0)
const answers = ref<Record<string, string>>({})
const questionIndex = ref(0)
const groupStats = ref<GroupQuestionStat[] | null>(null)
const personalResult = ref<ParticipantResult | null>(null)
const demoOverviewCards = ref<OverviewCard[]>([])
const liveOverviewCards = ref<OverviewCard[]>([])
const isLiveOverview = ref(false)
const overviewLoadError = ref('')
const isHost = ref(false)
const revealStep = ref(3)
const qrCodeDataUrl = ref('')
const copiedLink = ref(false)
const successRevealBeat = ref(0)
const quizInterstitialVisible = ref(false)
const audioMuted = ref(isAudioMuted())
let quizInterstitialTimer: number | null = null
let hostLobbyRefreshTimer: number | null = null
let unsubscribe: (() => void) | null = null

const activeQuestions = computed(() => {
  if (!session.value) return []
  return selectQuestionsForSession(session.value.code, session.value.questionnaire_version)
})
const currentQuestion = computed(() => activeQuestions.value[questionIndex.value])
const currentAnswer = computed(() => {
  const question = currentQuestion.value
  return question ? answers.value[question.id] : undefined
})
const progress = computed(() => {
  if (activeQuestions.value.length === 0) return 0
  return ((questionIndex.value + 1) / activeQuestions.value.length) * 100
})
const meResult = computed(() => {
  return personalResult.value
})
function pairedPeople(pairs: { participantId: string }[]) {
  return pairs
    .map((pair) => participants.value.find((item) => item.id === pair.participantId))
    .filter((person): person is Participant => Boolean(person))
}
const soulmates = computed(() => (meResult.value ? pairedPeople(meResult.value.soulmates) : []))
const opposites = computed(() => (meResult.value ? pairedPeople(meResult.value.opposites) : []))

const joinUrl = computed(() => {
  if (!session.value) return ''
  const url = new URL(window.location.href)
  url.search = ''
  url.searchParams.set('room', session.value.code)
  return url.toString()
})

const foodAvoid = ref<string[]>([])
// 忌口是題庫外的獨立統計，不能混進「飲食內戰／歷史性共識」的題目挑選
const questionStats = computed(() =>
  (groupStats.value ?? []).filter((stat) => stat.questionId !== FOOD_AVOID_ID),
)
const foodConsensus = computed(() =>
  calculateFoodConsensus(groupStats.value?.find((stat) => stat.questionId === FOOD_AVOID_ID)),
)

const resultSampleSize = computed(() => groupStats.value?.[0]?.sampleSize ?? 0)
const dinnerSuccess = computed(() =>
  calculateDinnerSuccessRate(
    groupStats.value ?? [],
    session.value?.questionnaire_version ?? 'v0.2',
  ),
)

const incompleteCount = computed(() =>
  Math.max(0, participants.value.length - completedCount.value),
)

const overviewCards = computed(() => (isLiveOverview.value ? liveOverviewCards.value : demoOverviewCards.value))
const overviewTotal = computed(() => (isLiveOverview.value ? participants.value.length : overviewCards.value.length))
const overviewCompleted = computed(() => overviewCards.value.filter((card) => card.status === 'complete').length)
const overviewRare = computed(() => overviewCards.value.filter((card) => Boolean(card.result?.rare)).length)
const overviewSuccess = computed(() => (isLiveOverview.value ? dinnerSuccess.value.score : 100))
const overviewSampleSize = computed(() => (isLiveOverview.value ? resultSampleSize.value : overviewTotal.value))

const quizEvent = computed(() => {
  const events: Record<number, { eyebrow: string; headline: string; text: string }> = {
    4: {
      eyebrow: '📡 場面觀察',
      headline: 'MINORITY DETECTED',
      text: '有人開始跟全場走不同方向。先不要找戰犯。',
    },
    8: {
      eyebrow: '⚠️ 中場警報',
      headline: 'CONSENSUS IS COLLAPSING',
      text: '如果你已經改過答案，代表你開始害怕被看穿了。',
    },
    11: {
      eyebrow: '🧨 最後兩題',
      headline: 'FINAL TWO',
      text: '友情還有機會。請慎選，系統都有看到。',
    },
  }

  return events[questionIndex.value + 1] ?? null
})

const waitingMessage = computed(() => {
  if (participants.value.length > 0 && completedCount.value === participants.value.length) {
    return '全員交卷。現在只剩主持人敢不敢按下去。'
  }
  if (incompleteCount.value === 1) {
    return '只剩 1 個人還在跟自己辯論。先不要催他。'
  }
  if (incompleteCount.value > 1) {
    return `還有 ${incompleteCount.value} 個人正在重新思考自己的人生。`
  }
  return '答案已交卷。主持人可以隨時揭曉。'
})

const hostLobbyMessage = computed(() => {
  if (participants.value.length === 0) return '等待第一位受害者掃碼…'
  if (completedCount.value === participants.value.length) {
    return '全員交卷。現在只剩主持人敢不敢按。'
  }
  if (completedCount.value === 0) {
    return `目前 ${participants.value.length} 個人聲稱自己很好約。`
  }
  return `${completedCount.value} 人已交卷，還有 ${incompleteCount.value} 人正在跟自己辯論。`
})

const selfReportedEasygoing = computed(() => {
  const stat = groupStats.value?.find((item) => item.questionId === 'self-image')
  return stat?.counts.very ?? 0
})

const unanimousStat = computed(() => {
  if (resultSampleSize.value < 2) return null
  return questionStats.value.find((stat) =>
    Object.values(stat.counts).some((count) => count === stat.sampleSize),
  ) ?? null
})

const splitStat = computed(() => {
  if (resultSampleSize.value < 2) return null

  let best: GroupQuestionStat | null = null
  let bestGap = Number.POSITIVE_INFINITY

  for (const stat of questionStats.value) {
    const counts = Object.values(stat.counts).sort((a, b) => b - a)
    if (counts.length < 2) continue
    const gap = Math.abs(counts[0]! - counts[1]!)
    if (gap < bestGap) {
      best = stat
      bestGap = gap
    }
  }

  return best
})

function questionPrompt(questionId: string) {
  return activeQuestions.value.find((question) => question.id === questionId)?.prompt ?? questionId
}

function statSummary(stat: GroupQuestionStat) {
  const question = activeQuestions.value.find((item) => item.id === stat.questionId)
  if (!question) return ''

  return question.options
    .map((option) => `${option.emoji} ${stat.counts[option.id] ?? 0}`)
    .join('  ·  ')
}

function fail(error: unknown) {
  console.error(error)
  errorMessage.value = error instanceof Error ? error.message : '發生錯誤，請再試一次。'
}

async function withBusy(task: () => Promise<void>) {
  busy.value = true
  errorMessage.value = ''
  try {
    await task()
  } catch (error) {
    fail(error)
  } finally {
    busy.value = false
  }
}

function clearRoomInUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('room')
  url.searchParams.delete('view')
  window.history.replaceState({}, '', url)
}

function setRoomInUrl(code: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('room', code)
  window.history.replaceState({}, '', url)
}

function setRoomView(view: 'overview' | undefined) {
  const url = new URL(window.location.href)
  if (view) url.searchParams.set('view', view)
  else url.searchParams.delete('view')
  requestedRoomOverview.value = view === 'overview'
  window.history.replaceState({}, '', url)
}

function stopHostLobbyRefresh() {
  if (hostLobbyRefreshTimer === null) return
  window.clearInterval(hostLobbyRefreshTimer)
  hostLobbyRefreshTimer = null
}

function startHostLobbyRefresh() {
  stopHostLobbyRefresh()
  if (!isHost.value || participant.value || session.value?.status !== 'open') return

  hostLobbyRefreshTimer = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return
    void refreshSessionState().catch(fail)
  }, 3000)
}

async function updateJoinQr() {
  if (!joinUrl.value) return
  try {
    qrCodeDataUrl.value = await QRCode.toDataURL(joinUrl.value, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
  } catch (error) {
    console.warn('QR code generation failed', error)
  }
}

async function copyJoinLink() {
  if (!joinUrl.value) return
  try {
    await navigator.clipboard.writeText(joinUrl.value)
    copiedLink.value = true
    window.setTimeout(() => {
      copiedLink.value = false
    }, 1800)
  } catch (error) {
    fail(error)
  }
}

async function restoreFromUrl() {
  const code = new URL(window.location.href).searchParams.get('room')
  if (!code) return

  await withBusy(async () => {
    roomCode.value = code.toUpperCase()
    const userId = await ensureUserId()
    try {
      session.value = await getSessionByCode(roomCode.value)
    } catch (error) {
      if (!(error instanceof SessionNotFoundError)) throw error
      // 網址上的房號已失效：清掉它，回到加入畫面讓使用者重新輸入
      clearRoomInUrl()
      session.value = null
      screen.value = 'join'
      throw error
    }
    isHost.value = session.value.host_user_id === userId
    participant.value = await getOwnParticipant(session.value.id)
    if (isHost.value) await updateJoinQr()

    if (participant.value) {
      name.value = participant.value.display_name
      const ownResponse = await getOwnResponse(session.value.id, participant.value.id)
      if (ownResponse) answers.value = ownResponse.answers
      foodAvoid.value = decodeFoodAvoid(answers.value[FOOD_AVOID_ID]) ?? []

      const firstUnanswered = activeQuestions.value.findIndex(
        (question) => question.required && !answers.value[question.id],
      )
      questionIndex.value =
        firstUnanswered === -1 ? Math.max(0, activeQuestions.value.length - 1) : firstUnanswered
    }

    await attachRealtime()
    await refreshSessionState()

    if (session.value.status === 'open') {
      if (isHost.value && !participant.value) {
        screen.value = 'host'
        startHostLobbyRefresh()
      } else if (participant.value) screen.value = !ownResponseIsComplete() ? 'quiz' : answers.value[FOOD_AVOID_ID] ? 'waiting' : 'food'
      else screen.value = 'join'
    }
  })
}

function ownResponseIsComplete() {
  return activeQuestions.value.every(
    (question) => !question.required || Boolean(answers.value[question.id]),
  )
}

async function loadLiveOverview() {
  if (!session.value || !isHost.value || session.value.status !== 'revealed') return

  try {
    const rows = await listParticipantResults(session.value.id)
    const resultByParticipant = new Map(rows.map((row) => [row.participant_id, row.result]))
    liveOverviewCards.value = participants.value.map((person, index) => {
      const result = resultByParticipant.get(person.id) ?? null
      return {
        code: `P${String(index + 1).padStart(2, '0')}`,
        participant: person,
        result,
        status: result ? 'complete' : person.completed_at ? 'pending' : 'incomplete',
      }
    })
    overviewLoadError.value = ''
    isLiveOverview.value = true
  } catch (error) {
    overviewLoadError.value = '全員人格總覽尚未啟用，請先套用資料庫權限 migration。'
    throw error
  }
}

async function openLiveOverview() {
  if (!session.value || !isHost.value || session.value.status !== 'revealed') return
  await withBusy(async () => {
    setRoomView('overview')
    await loadLiveOverview()
    screen.value = 'overview'
  })
}

function closeLiveOverview() {
  setRoomView(undefined)
  isLiveOverview.value = false
  liveOverviewCards.value = []
  overviewLoadError.value = ''
  screen.value = 'host'
}

async function refreshSessionState() {
  if (!session.value) return
  const latest = await getSessionByCode(session.value.code)
  session.value = latest
  participants.value = await listParticipants(latest.id)
  completedCount.value = participants.value.filter((item) => Boolean(item.completed_at)).length

  if (latest.status === 'locked') {
    stopHostLobbyRefresh()
    screen.value = isHost.value ? 'host' : 'revealing'
    return
  }

  if (latest.status === 'revealed') {
    stopHostLobbyRefresh()
    groupStats.value = await getGroupStats(latest.id)
    if (participant.value) {
      isLiveOverview.value = false
      liveOverviewCards.value = []
      personalResult.value = await getPersonalResult(latest.id, participant.value.id)
      screen.value = 'result'
    } else if (isHost.value && requestedRoomOverview.value) {
      screen.value = 'overview'
      await loadLiveOverview()
    } else {
      screen.value = 'host'
    }
  }
}

function attachRealtime(): Promise<void> {
  unsubscribe?.()
  if (!session.value) return Promise.resolve()

  let resolveSubscribed: (() => void) | undefined
  const subscribed = new Promise<void>((resolve) => {
    resolveSubscribed = resolve
  })
  unsubscribe = subscribeToSession(
    session.value.id,
    () => {
      void refreshSessionState().catch(fail)
    },
    () => resolveSubscribed?.(),
  )

  // 即時頻道建立需要非同步握手；重新開局後若太早讓參加者加入，主持人會漏掉第一筆事件。
  return Promise.race([subscribed, wait(1500)]).then(() => undefined)
}

async function startHost() {
  await enableAudioFromGesture()
  await withBusy(async () => {
    session.value = await createSession()
    roomCode.value = session.value.code
    isHost.value = true
    setRoomInUrl(session.value.code)
    await updateJoinQr()
    await attachRealtime()
    screen.value = 'host'
    if (!audioMuted.value) startLobbyLoop()
    await refreshSessionState()
    screen.value = 'host'
    startHostLobbyRefresh()
  })
}

// 開下一局前清掉上一局的全部狀態；暱稱保留，玩家不用重打
function resetRound() {
  unsubscribe?.()
  unsubscribe = null
  stopHostLobbyRefresh()
  if (quizInterstitialTimer !== null) {
    window.clearTimeout(quizInterstitialTimer)
    quizInterstitialTimer = null
  }
  quizInterstitialVisible.value = false
  session.value = null
  participant.value = null
  participants.value = []
  completedCount.value = 0
  answers.value = {}
  questionIndex.value = 0
  groupStats.value = null
  foodAvoid.value = []
  personalResult.value = null
  demoOverviewCards.value = []
  liveOverviewCards.value = []
  isLiveOverview.value = false
  overviewLoadError.value = ''
  isHost.value = false
  revealStep.value = 3
  successRevealBeat.value = 0
  qrCodeDataUrl.value = ''
  copiedLink.value = false
  roomCode.value = ''
  errorMessage.value = ''
  clearRoomInUrl()
}

async function playAgainAsHost() {
  resetRound()
  await startHost()
}

function playAgainAsPlayer() {
  resetRound()
  screen.value = 'join'
}

async function enableAudioFromGesture() {
  await unlockAudio()
  if (!audioMuted.value && (screen.value === 'landing' || screen.value === 'host')) startLobbyLoop()
}

function toggleAudio() {
  audioMuted.value = !audioMuted.value
  setAudioMuted(audioMuted.value)
  if (!audioMuted.value && (screen.value === 'landing' || screen.value === 'host')) startLobbyLoop()
}

async function startJoin() {
  await enableAudioFromGesture()
  stopLobbyLoop()
  playCue('reveal')
  screen.value = 'join'
}

async function joinRoom() {
  if (!roomCode.value.trim() || !name.value.trim()) {
    errorMessage.value = '請輸入房號和暱稱。'
    return
  }

  await withBusy(async () => {
    session.value = await getSessionByCode(roomCode.value.trim())
    if (session.value.status !== 'open') throw new Error('這一局已經開始揭曉囉。')
    participant.value = await joinSession(session.value.id, name.value.trim())
    setRoomInUrl(session.value.code)
    await attachRealtime()
    screen.value = 'quiz'
    await refreshSessionState()
  })
}

function choose(optionId: string) {
  const question = currentQuestion.value
  if (!question || session.value?.status !== 'open') return
  answers.value = { ...answers.value, [question.id]: optionId }
  playCue('click')
}

function triggerQuizInterstitial() {
  if (quizInterstitialTimer !== null) {
    window.clearTimeout(quizInterstitialTimer)
    quizInterstitialTimer = null
  }

  if (!quizEvent.value) {
    quizInterstitialVisible.value = false
    return
  }

  quizInterstitialVisible.value = true
  quizInterstitialTimer = window.setTimeout(() => {
    quizInterstitialVisible.value = false
    quizInterstitialTimer = null
  }, 1800)
}

async function nextQuestion() {
  if (!currentAnswer.value || !session.value || !participant.value) return

  await withBusy(async () => {
    await saveAnswers(session.value!, participant.value!.id, answers.value)

    if (questionIndex.value < activeQuestions.value.length - 1) {
      questionIndex.value += 1
      triggerQuizInterstitial()
      return
    }

    screen.value = 'food'
  })
}

function toggleFood(id: string) {
  if (session.value?.status !== 'open') return
  foodAvoid.value = foodAvoid.value.includes(id)
    ? foodAvoid.value.filter((item) => item !== id)
    : [...foodAvoid.value, id]
}

async function submitFood() {
  if (!session.value || !participant.value) return
  await withBusy(async () => {
    answers.value = { ...answers.value, [FOOD_AVOID_ID]: encodeFoodAvoid(foodAvoid.value) }
    await saveAnswers(session.value!, participant.value!.id, answers.value)
    screen.value = 'waiting'
    await refreshSessionState()
  })
}

function previousQuestion() {
  if (questionIndex.value > 0) questionIndex.value -= 1
}

async function editAnswers() {
  if (session.value?.status !== 'open') return
  questionIndex.value = 0
  screen.value = 'quiz'
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function runRevealCountdown() {
  stopLobbyLoop()
  for (const step of [3, 2, 1]) {
    revealStep.value = step
    playCue('countdown')
    await wait(850)
  }
}

async function runDinnerSuccessReveal() {
  if (!session.value) return

  groupStats.value = await previewLockedGroupStats(session.value)
  playCue('suspense')
  successRevealBeat.value = 1
  await wait(1300)
  successRevealBeat.value = 2
  await wait(1200)
  successRevealBeat.value = 3
  playCue('victory')
}

async function reveal() {
  await withBusy(async () => {
    if (!session.value || session.value.status !== 'open') return

    successRevealBeat.value = 0
    playCue('lock')
    await lockSession(session.value)
    await refreshSessionState()
    await runRevealCountdown()
    await runDinnerSuccessReveal()
  })
}

async function continueReveal() {
  await withBusy(async () => {
    if (!session.value || session.value.status !== 'locked') return
    successRevealBeat.value = 0
    await runRevealCountdown()
    await runDinnerSuccessReveal()
  })
}

async function revealPersonas() {
  await withBusy(async () => {
    if (!session.value || session.value.status !== 'locked') return
    groupStats.value = await finalizeReveal(session.value)
    playCue('reveal')
    await refreshSessionState()
  })
}

// 示意結果頁：?demo=result[&persona=key]，不連資料庫，供設計檢視與分享預覽
function showDemoResult(personaParam: string | null, rare = false) {
  const keys = Object.keys(PERSONAS) as PersonaKey[]
  const persona = keys.includes(personaParam as PersonaKey) ? (personaParam as PersonaKey) : 'foodFanatic'
  const person = (id: string, display_name: string): Participant => ({
    id, session_id: 'demo', user_id: id, display_name, completed_at: new Date().toISOString(),
  })
  demoOverviewCards.value = []
  liveOverviewCards.value = []
  isLiveOverview.value = false
  overviewLoadError.value = ''
  participants.value = [person('demo-me', 'Soda'), person('demo-soul', 'Amy'), person('demo-enemy', 'Ben')]
  participant.value = participants.value[0]!
  personalResult.value = {
    persona,
    rare,
    rareReason: rare ? RARE_CARD_REASON : undefined,
    soulmates: [{ participantId: 'demo-soul', similarity: 0.83 }],
    opposites: [{ participantId: 'demo-enemy', similarity: 0.08 }],
  }
  // 示意：三人排除的聯集之外剩下的類別
  groupStats.value = [
    { questionId: FOOD_AVOID_ID, counts: { hotpot: 1, spicy: 2, bbq: 1, vegetarian: 1 }, sampleSize: 3 },
  ]
  screen.value = 'result'
}

function showDemoOverview() {
  isLiveOverview.value = false
  liveOverviewCards.value = []
  overviewLoadError.value = ''
  const now = new Date().toISOString()
  const participantsFixture = Array.from({ length: 10 }, (_, index) => ({
    id: `demo-p${String(index + 1).padStart(2, '0')}`,
    session_id: 'demo-overview',
    user_id: `demo-p${String(index + 1).padStart(2, '0')}`,
    display_name: `P${String(index + 1).padStart(2, '0')}`,
    completed_at: now,
  }))
  const easygoing: PersonaKey = 'easygoing'

  demoOverviewCards.value = participantsFixture.map((participantFixture, index) => ({
    code: participantFixture.display_name,
    participant: participantFixture,
    result: {
      persona: easygoing,
      rare: index === 2,
      rareReason: index === 2 ? RARE_CARD_REASON : undefined,
    },
    status: 'complete',
  }))
  participants.value = participantsFixture
  participant.value = null
  personalResult.value = null

  const counts = Object.fromEntries(
    FOOD_OPTIONS.filter((food) => food.id !== 'japanese').map((food) => [food.id, 1]),
  )
  groupStats.value = [{ questionId: FOOD_AVOID_ID, counts, sampleSize: participantsFixture.length }]
  screen.value = 'overview'
}

onMounted(() => {
  const params = new URL(window.location.href).searchParams
  if (params.get('demo') === 'result') {
    if (params.get('view') === 'overview') showDemoOverview()
    else showDemoResult(params.get('persona'), params.get('rare') === '1')
    return
  }
  if (!hasRoomParam) return
  void restoreFromUrl()
    .catch(fail)
    .finally(() => {
      restoringFromUrl.value = false
    })
})

onBeforeUnmount(() => {
  stopLobbyLoop()
  unsubscribe?.()
  stopHostLobbyRefresh()
  if (quizInterstitialTimer !== null) window.clearTimeout(quizInterstitialTimer)
})
</script>

<template>
  <main class="app-shell">
    <button
      class="audio-toggle"
      type="button"
      :aria-label="audioMuted ? '開啟音效' : '關閉音效'"
      :title="audioMuted ? '開啟音效' : '關閉音效'"
      @click="toggleAudio"
    >
      {{ audioMuted ? '🔇' : '🔊' }}
    </button>
    <Transition name="interstitial">
      <aside
        v-if="quizInterstitialVisible && quizEvent"
        class="quiz-interstitial"
        role="status"
        aria-live="polite"
      >
        <div class="interstitial-signal" aria-hidden="true"><span></span><span></span><span></span></div>
        <span class="eyebrow">{{ quizEvent.eyebrow }}</span>
        <strong>{{ quizEvent.headline }}</strong>
        <p>{{ quizEvent.text }}</p>
      </aside>
    </Transition>

    <section v-if="restoringFromUrl" class="panel center state-panel restore-panel" role="status" aria-live="polite">
      <div class="state-code reveal-pulse">SYNC</div>
      <div class="eyebrow">RESTORING SESSION / 正在找回飯局</div>
      <h2>正在找回你的結果…</h2>
      <p class="lede">先別重新加入，這一局正在同步回來。</p>
    </section>

    <section v-else-if="screen === 'landing'" class="hero panel landing-panel">
      <div class="landing-meta">
        <span class="eyebrow">10/1 SOCIAL EXPERIMENT</span>
        <span class="signal-dot">LIVE TEST / 01</span>
      </div>
      <div class="hero-signal" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <h1 class="display-title" aria-label="都可以？">
        <span>都</span><span>可</span><span>以</span><span>？</span>
      </h1>
      <p class="lede landing-lede">大家都說「都可以」，一問去哪吃就全員裝死。今晚來抓內鬼。</p>
      <div class="action-stack landing-actions">
        <button class="primary" type="button" :disabled="busy" @click="startJoin">加入飯局 →</button>
        <button class="secondary host-mode-button" type="button" aria-label="我是主持人，開新局" :disabled="busy" @click="startHost">HOST MODE / 開新局</button>
      </div>
      <p class="landing-footnote">DINNER PERSONALITY / GROUP CONSENSUS / LIVE REVEAL</p>
    </section>

    <section v-else-if="screen === 'join'" class="panel">
      <button class="back-link" type="button" @click="screen = 'landing'">← 回去</button>
      <div class="eyebrow">加入這一局</div>
      <h2>先報上名來</h2>
      <label>
        房號
        <input v-model="roomCode" inputmode="text" maxlength="6" autocomplete="off" placeholder="ABC123" />
      </label>
      <label>
        暱稱
        <input v-model="name" maxlength="24" autocomplete="nickname" placeholder="例如：Soda" />
      </label>
      <div class="bottom-actions">
        <button class="primary" type="button" :disabled="busy" @click="joinRoom">
          {{ busy ? '加入中…' : '加入這一局' }}
        </button>
      </div>
    </section>

    <section v-else-if="screen === 'quiz'" class="panel quiz-panel">
      <div class="quiz-top">
        <span>第 {{ questionIndex + 1 }} / {{ activeQuestions.length }} 題</span>
        <span v-if="session?.status !== 'open'" class="locked-pill">已鎖定</span>
      </div>
      <div class="progress-track"><div class="progress-bar" :style="{ width: progress + '%' }" /></div>
      <div v-if="participant" class="quiz-player">
        <img class="avatar avatar-md" :src="avatarFor(participant.id)" alt="" />
        <strong class="quiz-player-name">{{ participant.display_name }}</strong>
      </div>
      <template v-if="currentQuestion">
        <h2 class="question">{{ currentQuestion.prompt }}</h2>
        <div class="choice-list">
          <button
            v-for="(option, optionIndex) in currentQuestion.options"
            :key="option.id"
            type="button"
            class="choice"
            :class="{ selected: currentAnswer === option.id }"
            :disabled="session?.status !== 'open'"
            @click="choose(option.id)"
          >
            <span class="choice-index">{{ optionIndex === 0 ? 'A' : 'B' }}</span>
            <span class="choice-label">{{ option.label }}</span>
            <span class="choice-emoji" aria-hidden="true">{{ option.emoji }}</span>
          </button>
        </div>
      </template>
      <div class="bottom-actions inline">
        <button class="secondary" type="button" :disabled="questionIndex === 0" @click="previousQuestion">上一題</button>
        <button class="primary" type="button" :disabled="!currentAnswer || busy" @click="nextQuestion">
          {{ questionIndex === activeQuestions.length - 1 ? '交卷' : '下一題' }}
        </button>
      </div>
    </section>

    <section v-else-if="screen === 'food'" class="panel quiz-panel">
      <div class="quiz-top"><span>最後一步</span></div>
      <div class="progress-track"><div class="progress-bar" :style="{ width: '100%' }" /></div>
      <h2 class="question">有哪些是你不吃或吃不了的？</h2>
      <p class="lede">沒勾的都算你能接受。全組都沒排除的，揭曉時會列成「大家都能吃」清單。</p>
      <div class="choice-list food-list">
        <button
          v-for="food in FOOD_OPTIONS"
          :key="food.id"
          type="button"
          class="choice"
          :class="{ selected: foodAvoid.includes(food.id) }"
          :aria-pressed="foodAvoid.includes(food.id)"
          :disabled="session?.status !== 'open'"
          @click="toggleFood(food.id)"
        >
          <span class="choice-label">{{ food.label }}</span>
          <span class="choice-emoji" aria-hidden="true">{{ food.emoji }}</span>
        </button>
      </div>
      <div class="bottom-actions inline">
        <button class="secondary" type="button" @click="screen = 'quiz'">回上一題</button>
        <button class="primary" type="button" :disabled="busy" @click="submitFood">
          {{ foodAvoid.length === 0 ? '我都能吃，交卷' : '排除 ' + foodAvoid.length + ' 項，交卷' }}
        </button>
      </div>
    </section>

    <section v-else-if="screen === 'waiting'" class="panel center state-panel">
      <img v-if="participant" class="avatar avatar-lg" :src="avatarFor(participant.id)" alt="" />
      <div class="state-code">READY</div>
      <div class="eyebrow">RESPONSE LOCKED IN</div>
      <h2>你答完了。先不要偷看別人。</h2>
      <p class="lede state-metric">{{ completedCount }} / {{ participants.length }} COMPLETE</p>
      <p class="waiting-joke">{{ waitingMessage }}</p>
      <button v-if="session?.status === 'open'" class="secondary" type="button" @click="editAnswers">修改答案 ↗</button>
      <p v-else class="locked-copy">主持人已鎖定答案，準備揭曉。</p>
    </section>

    <section v-else-if="screen === 'revealing'" class="panel center reveal-wait state-panel">
      <div class="state-code reveal-pulse">LOCKED</div>
      <div class="eyebrow">GROUP ANALYSIS / 全場結算中</div>
      <h2>正在判斷你到底多難約…</h2>
      <p class="lede">先別動。大螢幕正在公布這團的命運，人格卡會自己翻出來。</p>
      <div class="status-pill"><span></span> WAITING FOR HOST</div>
    </section>

    <section v-else-if="screen === 'host'" class="panel host-panel">
      <div class="host-header">
        <div>
          <div class="eyebrow">HOST / CONTROL ROOM</div>
          <h2 class="host-room-heading">房號 <span>{{ session?.code }}</span></h2>
        </div>
        <div class="live-badge"><span></span> LIVE</div>
      </div>
      <p class="lede">掃 QR Code 或輸入房號加入。不限人數，覺得差不多就可以揭曉。</p>

      <div class="host-join-card">
        <img v-if="qrCodeDataUrl" class="join-qr" :src="qrCodeDataUrl" alt="加入這一局的 QR Code" />
        <div class="host-join-copy">
          <div class="eyebrow">掃碼加入</div>
          <strong class="room-code">{{ session?.code }}</strong>
          <button class="secondary compact-button" type="button" @click="copyJoinLink">
            {{ copiedLink ? '已複製連結 ✓' : '複製加入連結' }}
          </button>
        </div>
      </div>

      <div class="metric-grid">
        <div class="metric"><strong>{{ participants.length }}</strong><span>已加入</span></div>
        <div class="metric"><strong>{{ completedCount }}</strong><span>已完成</span></div>
      </div>

      <p v-if="session?.status === 'open'" class="host-live-copy">{{ hostLobbyMessage }}</p>

      <div class="people">
        <div v-for="(person, personIndex) in participants" :key="person.id" class="person-row">
          <span class="subject-index">{{ String(personIndex + 1).padStart(2, '0') }}</span>
          <img class="avatar" :src="avatarFor(person.id)" alt="" />
          <span class="subject-name">{{ person.display_name }}</span>
          <span class="subject-status" :class="{ ready: Boolean(person.completed_at) }">
            {{ person.completed_at ? 'READY' : 'THINKING' }}
          </span>
        </div>
      </div>

      <div v-if="session?.status === 'locked' && groupStats" class="dinner-success-reveal">
        <div class="eyebrow">今晚的飯局命運已算出來</div>
        <p class="success-question">🍽️ 我們這團今晚約成飯的成功率</p>

        <div v-if="successRevealBeat === 1" class="success-build-up" aria-live="polite">
          <span>先看你們怎麼說自己</span>
          <strong>{{ selfReportedEasygoing }} / {{ resultSampleSize }} 人覺得自己「超好約」</strong>
          <p>先記住這個數字。</p>
        </div>

        <div v-else-if="successRevealBeat === 2" class="success-build-up" aria-live="polite">
          <span>但答案比你們誠實</span>
          <strong>實際成功率是……</strong>
          <p>希望你們等等還願意一起吃飯。</p>
        </div>

        <template v-else>
          <div class="success-score">{{ resultSampleSize > 1 ? dinnerSuccess.score + '%' : '樣本不足' }}</div>
          <h3>{{ dinnerSuccess.verdict }}</h3>
          <p class="lede">{{ dinnerSuccess.detail }}</p>
          <p class="persona-tease">成功率看完了。現在看看問題到底出在誰身上。</p>
          <button class="primary persona-reveal-button" type="button" :disabled="busy" @click="revealPersonas">
            {{ busy ? '正在翻牌…' : '公開處刑 🎴' }}
          </button>
        </template>
      </div>

      <div v-else-if="session?.status === 'locked'" class="host-countdown">
        <div class="eyebrow">全場結算中</div>
        <p class="host-joke">正在計算你們今晚到底約不約得成…</p>
        <div class="countdown-number">{{ revealStep }}</div>
        <button
          v-if="!busy"
          class="secondary resume-reveal"
          type="button"
          @click="continueReveal"
        >
          繼續揭曉
        </button>
      </div>

      <div v-else-if="groupStats" class="group-result host-results">
        <div class="eyebrow">人格卡已同步翻開 · 有效樣本 {{ resultSampleSize }} 人</div>

        <article class="group-verdict-card">
          <span class="result-kicker">🍽️ 今晚約成飯的成功率</span>
          <strong class="group-verdict">{{ dinnerSuccess.verdict }}</strong>
          <div class="compatibility-score">{{ resultSampleSize > 1 ? dinnerSuccess.score + '%' : '樣本不足' }}</div>
          <p>{{ dinnerSuccess.detail }}</p>
        </article>

        <h3>現在請各自面對自己的飲食人格。 🎴</h3>

        <div class="host-result-grid">
          <article class="host-result-card">
            <span class="result-kicker">😇 都可以自信值</span>
            <strong>{{ selfReportedEasygoing }} / {{ resultSampleSize }}</strong>
            <p>有 {{ selfReportedEasygoing }} 個人覺得自己「超好約」。先記住這個數字。</p>
          </article>

          <article v-if="splitStat" class="host-result-card">
            <span class="result-kicker">🚨 飲食內戰</span>
            <strong>{{ statSummary(splitStat) }}</strong>
            <p>{{ questionPrompt(splitStat.questionId) }}</p>
          </article>

          <article v-if="unanimousStat" class="host-result-card">
            <span class="result-kicker">🏛️ 歷史性共識</span>
            <strong>{{ statSummary(unanimousStat) }}</strong>
            <p>{{ questionPrompt(unanimousStat.questionId) }}</p>
          </article>
        </div>

        <article v-if="foodConsensus" class="food-consensus" data-testid="food-consensus">
          <span class="result-kicker">🍽️ 大家都能吃</span>
          <template v-if="foodConsensus.safe.length">
            <ul class="food-chips">
              <li v-for="food in foodConsensus.safe" :key="food.id">{{ food.emoji }} {{ food.label }}</li>
            </ul>
            <p>{{ foodConsensus.sampleSize }} 人都沒排除的類別，挑一個就不會有人被迫吃不想吃的。</p>
          </template>
          <template v-else>
            <strong>沒有全員都能接受的類別。那就別聚餐了。</strong>
            <p>這團連一個安全牌都沒有，硬約只會有人委屈。</p>
          </template>
        </article>

        <article class="final-social-challenge">
          <span class="result-kicker">🎴 最後任務</span>
          <strong>全部把手機舉起來。</strong>
          <p>先找到你的靈魂飯友，再找飲食天敵。找到天敵的人先不要辯解。</p>
        </article>

        <p class="host-result-footer">手機已同步翻牌。剩下的交給你們互相吐槽。</p>

        <div class="bottom-actions inline">
          <button class="secondary" type="button" :disabled="busy" @click="openLiveOverview">查看全員人格 ↗</button>
          <button class="primary" type="button" :disabled="busy" @click="playAgainAsHost">重新開局 ↻</button>
        </div>
      </div>

      <div v-else class="bottom-actions">
        <button class="primary" type="button" :disabled="busy || completedCount === 0" @click="reveal">
          {{ busy ? '正在公開處刑…' : '鎖定並揭曉' }}
        </button>
      </div>
    </section>

    <section v-else-if="screen === 'overview'" class="panel result-panel overview-panel" data-testid="result-overview">
      <header class="overview-header">
        <div>
          <div class="eyebrow">{{ isLiveOverview ? 'LIVE SESSION / HOST OVERVIEW' : '10 PERSON TEST / RESULT OVERVIEW' }}</div>
          <h2>{{ isLiveOverview ? `房號 ${session?.code} · 全員人格已揭曉` : '今晚這團，十個人都回來了。' }}</h2>
          <p class="lede">{{ isLiveOverview ? '只有主持人可以查看這頁；參與者手機仍保留個人結果。' : '這是 10 人並行測試的完整結果。沒有人掉線，只有一張稀有卡。' }}</p>
        </div>
        <span class="live-badge"><span></span> {{ isLiveOverview ? 'LIVE RESULT' : 'DEMO RESULT' }}</span>
      </header>

      <div class="overview-summary">
        <div class="overview-metric" data-testid="overview-summary-completed">
          <strong>{{ overviewCompleted }} / {{ overviewTotal }}</strong>
          <span>COMPLETE</span>
        </div>
        <div class="overview-metric" data-testid="overview-summary-rare">
          <strong>{{ overviewRare }}</strong>
          <span>RARE CARD</span>
        </div>
        <div class="overview-metric" data-testid="overview-summary-success">
          <strong>{{ overviewSuccess > 0 ? overviewSuccess + '%' : '樣本不足' }}</strong>
          <span>DINNER SUCCESS</span>
        </div>
      </div>

      <div class="overview-card-grid" data-testid="overview-card-grid">
        <article
          v-for="card in overviewCards"
          :key="card.participant.id"
          class="overview-card"
          :class="{ rare: card.result?.rare, incomplete: card.status !== 'complete' }"
          data-testid="overview-card"
        >
          <header class="overview-card-head">
            <span data-testid="overview-card-code">{{ card.code }}</span>
            <span data-testid="overview-card-status">{{ card.status === 'complete' ? 'COMPLETE' : card.status === 'pending' ? 'RESULT PENDING' : 'INCOMPLETE' }}</span>
          </header>
          <div class="overview-card-body">
            <img
              v-if="card.result && personaArt(card.result.persona)"
              class="overview-card-art"
              :src="personaArt(card.result.persona)"
              :alt="PERSONAS[card.result.persona].name"
            />
            <div v-else class="overview-card-art overview-card-placeholder">?</div>
            <div class="overview-card-copy">
              <span class="result-kicker" data-testid="overview-card-persona">
                {{ card.result ? `TYPE ${PERSONA_DISPLAY[card.result.persona].code} · ${PERSONA_DISPLAY[card.result.persona].label}` : card.status === 'pending' ? 'RESULT PENDING' : 'NO PERSONA RESULT' }}
              </span>
              <strong>{{ card.participant.display_name }}</strong>
              <span>{{ card.result ? PERSONAS[card.result.persona].name : '尚未產生人格卡' }}</span>
            </div>
          </div>
          <span v-if="card.result?.rare" class="rare-badge">★ SSR · 頂級稀有</span>
        </article>
      </div>

      <article v-if="foodConsensus" class="food-consensus overview-consensus" data-testid="overview-consensus">
        <span class="result-kicker">🍽️ 大家都能吃</span>
        <template v-if="foodConsensus.safe.length">
          <ul class="food-chips">
            <li v-for="food in foodConsensus.safe" :key="food.id">{{ food.emoji }} {{ food.label }}</li>
          </ul>
          <p>{{ overviewSampleSize }} 人都沒排除{{ foodConsensus.safe[0]?.label }}，這是本場不需要犧牲任何人的選項。</p>
        </template>
        <template v-else>
          <strong>沒有全員都能接受的類別。那就別聚餐了。</strong>
          <p>這團連一個安全牌都沒有，硬約只會有人委屈。</p>
        </template>
      </article>

      <p v-if="overviewLoadError" class="error overview-error" role="alert">{{ overviewLoadError }}</p>
      <div class="bottom-actions overview-actions">
        <button v-if="isLiveOverview" class="secondary" type="button" @click="closeLiveOverview">回到主持人結果</button>
      </div>
    </section>

    <section v-else-if="screen === 'result'" class="panel result-panel">
      <template v-if="meResult">
        <div class="eyebrow persona-result-label">你的飲食人格 / DINNER IDENTITY</div>
        <div v-if="meResult.rare" class="rare-announce">
          <p>✨ 恭喜，你拿到本場的頂級稀有卡 ✨</p>
          <p class="rare-reason"><strong>稀有原因：</strong>{{ meResult.rareReason ?? RARE_CARD_REASON }}</p>
        </div>
        <article class="persona-card" :class="{ rare: meResult.rare }" :data-persona="meResult.persona">
          <header class="persona-card-head">
            <span>TYPE {{ PERSONA_DISPLAY[meResult.persona].code }}</span>
            <span v-if="meResult.rare" class="rare-badge">★ SSR · 頂級稀有</span>
            <span v-else>DINNER IDENTITY</span>
          </header>

          <div class="persona-visual">
            <img
              v-if="personaArt(meResult.persona)"
              class="persona-art"
              :src="personaArt(meResult.persona)"
              :alt="PERSONAS[meResult.persona].name"
            />
            <PersonaGlyph v-else :persona="meResult.persona" />
          </div>

          <div class="persona-copy">
            <div class="eyebrow">{{ PERSONA_DISPLAY[meResult.persona].label }}</div>
            <h2>{{ PERSONAS[meResult.persona].name }}</h2>
            <p class="persona-tagline">「{{ PERSONAS[meResult.persona].tagline }}」</p>
          </div>

          <div class="match-grid">
            <div class="match-card">
              <span>MATCH / 靈魂飯友</span>
              <ul v-if="soulmates.length" class="match-people">
                <li v-for="person in soulmates" :key="person.id">
                  <img class="avatar avatar-match" :src="avatarFor(person.id)" alt="" />
                  <strong>{{ person.display_name }}</strong>
                </li>
              </ul>
              <strong v-else>NO MATCH YET</strong>
            </div>
            <div class="match-card enemy">
              <span>ENEMY / 飲食天敵</span>
              <ul v-if="opposites.length" class="match-people">
                <li v-for="person in opposites" :key="person.id">
                  <img class="avatar avatar-match" :src="avatarFor(person.id)" alt="" />
                  <strong>{{ person.display_name }}</strong>
                </li>
              </ul>
              <strong v-else>NO ENEMY YET</strong>
            </div>
          </div>
        </article>
      </template>
      <template v-else>
        <div class="state-code">N/A</div>
        <div class="eyebrow">RESULT NOT GENERATED</div>
        <h2>你沒有答完</h2>
        <p class="persona-tagline">這次不硬判人格。下局記得交卷，才會拿到人格卡和飯友配對。</p>
      </template>

      <article v-if="foodConsensus" class="food-consensus" data-testid="food-consensus">
        <span class="result-kicker">🍽️ 大家都能吃</span>
        <template v-if="foodConsensus.safe.length">
          <ul class="food-chips">
            <li v-for="food in foodConsensus.safe" :key="food.id">{{ food.emoji }} {{ food.label }}</li>
          </ul>
          <p>{{ foodConsensus.sampleSize }} 人都沒排除的類別，挑一個就不會有人被迫吃不想吃的。</p>
        </template>
        <template v-else>
          <strong>沒有全員都能接受的類別。那就別聚餐了。</strong>
          <p>這團連一個安全牌都沒有，硬約只會有人委屈。</p>
        </template>
      </article>

      <div class="bottom-actions">
        <button class="secondary" type="button" @click="playAgainAsPlayer">加入新的一局 ↻</button>
      </div>
    </section>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
  </main>
</template>
