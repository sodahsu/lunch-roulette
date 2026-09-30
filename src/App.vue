<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import QRCode from 'qrcode'
import PersonaGlyph from './components/PersonaGlyph.vue'
import { PERSONAS, selectQuestionsForSession } from './domain/questions'
import { calculateDinnerSuccessRate } from './domain/domain'
import type { GroupQuestionStat, Participant, ParticipantResult, PersonaKey } from './domain/types'
import {
  createSession,
  getSessionByCode,
  getGroupStats,
  getPersonalResult,
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

type Screen = 'landing' | 'join' | 'quiz' | 'waiting' | 'host' | 'revealing' | 'result'

const PERSONA_DISPLAY: Record<PersonaKey, { code: string; label: string }> = {
  peacekeeper: { code: '01', label: 'PEACEKEEPER' },
  contrarian: { code: '02', label: 'CONTRARIAN' },
  picky: { code: '03', label: 'PICKY EATER' },
  adventurer: { code: '04', label: 'ADVENTURE TYPE' },
  valueHunter: { code: '05', label: 'VALUE HUNTER' },
  homebody: { code: '06', label: 'HOME RADIUS TYPE' },
  foodFanatic: { code: '07', label: 'FOOD FANATIC' },
  easygoing: { code: '08', label: 'TRULY EASYGOING' },
}

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
const isHost = ref(false)
const revealStep = ref(3)
const qrCodeDataUrl = ref('')
const copiedLink = ref(false)
const successRevealBeat = ref(0)
const quizInterstitialVisible = ref(false)
let quizInterstitialTimer: number | null = null
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
const soulmateNames = computed(() => {
  if (!meResult.value) return []
  return meResult.value.soulmates
    .map((pair) => participants.value.find((item) => item.id === pair.participantId)?.display_name)
    .filter(Boolean)
})
const oppositeNames = computed(() => {
  if (!meResult.value) return []
  return meResult.value.opposites
    .map((pair) => participants.value.find((item) => item.id === pair.participantId)?.display_name)
    .filter(Boolean)
})

const joinUrl = computed(() => {
  if (!session.value) return ''
  const url = new URL(window.location.href)
  url.search = ''
  url.searchParams.set('room', session.value.code)
  return url.toString()
})

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
  return groupStats.value?.find((stat) =>
    Object.values(stat.counts).some((count) => count === stat.sampleSize),
  ) ?? null
})

const splitStat = computed(() => {
  if (resultSampleSize.value < 2) return null

  let best: GroupQuestionStat | null = null
  let bestGap = Number.POSITIVE_INFINITY

  for (const stat of groupStats.value ?? []) {
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
  window.history.replaceState({}, '', url)
}

function setRoomInUrl(code: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('room', code)
  window.history.replaceState({}, '', url)
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

      const firstUnanswered = activeQuestions.value.findIndex(
        (question) => question.required && !answers.value[question.id],
      )
      questionIndex.value =
        firstUnanswered === -1 ? Math.max(0, activeQuestions.value.length - 1) : firstUnanswered
    }

    attachRealtime()
    await refreshSessionState()

    if (session.value.status === 'open') {
      if (isHost.value && !participant.value) screen.value = 'host'
      else if (participant.value) screen.value = ownResponseIsComplete() ? 'waiting' : 'quiz'
      else screen.value = 'join'
    }
  })
}

function ownResponseIsComplete() {
  return activeQuestions.value.every(
    (question) => !question.required || Boolean(answers.value[question.id]),
  )
}

async function refreshSessionState() {
  if (!session.value) return
  const latest = await getSessionByCode(session.value.code)
  session.value = latest
  participants.value = await listParticipants(latest.id)
  completedCount.value = participants.value.filter((item) => Boolean(item.completed_at)).length

  if (latest.status === 'locked') {
    screen.value = isHost.value ? 'host' : 'revealing'
    return
  }

  if (latest.status === 'revealed') {
    groupStats.value = await getGroupStats(latest.id)
    if (participant.value) {
      personalResult.value = await getPersonalResult(latest.id, participant.value.id)
      screen.value = 'result'
    } else {
      screen.value = 'host'
    }
  }
}

function attachRealtime() {
  unsubscribe?.()
  if (!session.value) return
  unsubscribe = subscribeToSession(session.value.id, () => {
    void refreshSessionState().catch(fail)
  })
}

async function startHost() {
  await withBusy(async () => {
    session.value = await createSession()
    roomCode.value = session.value.code
    isHost.value = true
    setRoomInUrl(session.value.code)
    await updateJoinQr()
    screen.value = 'host'
    attachRealtime()
    await refreshSessionState()
  })
}

// 開下一局前清掉上一局的全部狀態；暱稱保留，玩家不用重打
function resetRound() {
  unsubscribe?.()
  unsubscribe = null
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
  personalResult.value = null
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

function startJoin() {
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
    screen.value = 'quiz'
    attachRealtime()
    await refreshSessionState()
  })
}

function choose(optionId: string) {
  const question = currentQuestion.value
  if (!question || session.value?.status !== 'open') return
  answers.value = { ...answers.value, [question.id]: optionId }
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
  for (const step of [3, 2, 1]) {
    revealStep.value = step
    await wait(850)
  }
}

async function runDinnerSuccessReveal() {
  if (!session.value) return

  groupStats.value = await previewLockedGroupStats(session.value)
  successRevealBeat.value = 1
  await wait(1300)
  successRevealBeat.value = 2
  await wait(1200)
  successRevealBeat.value = 3
}

async function reveal() {
  await withBusy(async () => {
    if (!session.value || session.value.status !== 'open') return

    successRevealBeat.value = 0
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
    await refreshSessionState()
  })
}

onMounted(() => {
  void restoreFromUrl().catch(fail)
})

onBeforeUnmount(() => {
  unsubscribe?.()
  if (quizInterstitialTimer !== null) window.clearTimeout(quizInterstitialTimer)
})
</script>

<template>
  <main class="app-shell">
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

    <section v-if="screen === 'landing'" class="hero panel landing-panel">
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

    <section v-else-if="screen === 'waiting'" class="panel center state-panel">
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
          <span class="avatar">{{ person.display_name.slice(0, 1).toUpperCase() }}</span>
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

        <article class="final-social-challenge">
          <span class="result-kicker">🎴 最後任務</span>
          <strong>全部把手機舉起來。</strong>
          <p>先找到你的靈魂飯友，再找飲食天敵。找到天敵的人先不要辯解。</p>
        </article>

        <p class="host-result-footer">手機已同步翻牌。剩下的交給你們互相吐槽。</p>

        <div class="bottom-actions">
          <button class="primary" type="button" :disabled="busy" @click="playAgainAsHost">再開一局 ↻</button>
        </div>
      </div>

      <div v-else class="bottom-actions">
        <button class="primary" type="button" :disabled="busy || completedCount === 0" @click="reveal">
          {{ busy ? '正在公開處刑…' : '鎖定並揭曉' }}
        </button>
      </div>
    </section>

    <section v-else-if="screen === 'result'" class="panel result-panel">
      <template v-if="meResult">
        <div class="eyebrow persona-result-label">你的飲食人格 / DINNER IDENTITY</div>
        <article class="persona-card" :data-persona="meResult.persona">
          <header class="persona-card-head">
            <span>TYPE {{ PERSONA_DISPLAY[meResult.persona].code }}</span>
            <span>DINNER IDENTITY</span>
          </header>

          <div class="persona-visual">
            <PersonaGlyph :persona="meResult.persona" />
          </div>

          <div class="persona-copy">
            <div class="eyebrow">{{ PERSONA_DISPLAY[meResult.persona].label }}</div>
            <h2>{{ PERSONAS[meResult.persona].name }}</h2>
            <p class="persona-tagline">「{{ PERSONAS[meResult.persona].tagline }}」</p>
          </div>

          <div class="match-grid">
            <div class="match-card">
              <span>MATCH / 靈魂飯友</span>
              <strong>{{ soulmateNames.length ? soulmateNames.join('、') : 'NO MATCH YET' }}</strong>
            </div>
            <div class="match-card enemy">
              <span>ENEMY / 飲食天敵</span>
              <strong>{{ oppositeNames.length ? oppositeNames.join('、') : 'NO ENEMY YET' }}</strong>
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

      <div class="bottom-actions">
        <button class="secondary" type="button" @click="playAgainAsPlayer">加入新的一局 ↻</button>
      </div>
    </section>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
  </main>
</template>
