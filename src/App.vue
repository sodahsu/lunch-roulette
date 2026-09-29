<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { PERSONAS, QUESTIONS } from './domain/questions'
import type { GroupQuestionStat, Participant, ParticipantResult } from './domain/types'
import {
  createSession,
  getSessionByCode,
  getGroupStats,
  getPersonalResult,
  joinSession,
  listParticipants,
  lockAndReveal,
  saveAnswers,
  subscribeToSession,
  type SessionRecord,
} from './lib/session-service'

type Screen = 'landing' | 'join' | 'quiz' | 'waiting' | 'host' | 'result'

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
let unsubscribe: (() => void) | null = null

const currentQuestion = computed(() => QUESTIONS[questionIndex.value])
const currentAnswer = computed(() => {
  const question = currentQuestion.value
  return question ? answers.value[question.id] : undefined
})
const progress = computed(() => ((questionIndex.value + 1) / QUESTIONS.length) * 100)
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

async function refreshSessionState() {
  if (!session.value) return
  const latest = await getSessionByCode(session.value.code)
  session.value = latest
  participants.value = await listParticipants(latest.id)
  completedCount.value = participants.value.filter((item) => Boolean(item.completed_at)).length

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
    screen.value = 'host'
    attachRealtime()
    await refreshSessionState()
  })
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

async function nextQuestion() {
  if (!currentAnswer.value) return

  if (questionIndex.value < QUESTIONS.length - 1) {
    questionIndex.value += 1
    return
  }

  await withBusy(async () => {
    if (!session.value || !participant.value) return
    await saveAnswers(session.value.id, participant.value.id, answers.value)
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

async function reveal() {
  await withBusy(async () => {
    if (!session.value) return
    groupStats.value = await lockAndReveal(session.value)
    await refreshSessionState()
  })
}

onBeforeUnmount(() => unsubscribe?.())
</script>

<template>
  <main class="app-shell">
    <section v-if="screen === 'landing'" class="hero panel">
      <div class="eyebrow">10/1 設計交流會</div>
      <div class="hero-emoji" aria-hidden="true">🍜</div>
      <h1>都可以？</h1>
      <p class="lede">8 個人都說自己很好約，最後看看誰才是真的「都可以」。</p>
      <div class="action-stack">
        <button class="primary" type="button" :disabled="busy" @click="startJoin">加入朋友的房間</button>
        <button class="secondary" type="button" :disabled="busy" @click="startHost">我是主持人，開新局</button>
      </div>
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
        <span>第 {{ questionIndex + 1 }} / {{ QUESTIONS.length }} 題</span>
        <span v-if="session?.status !== 'open'" class="locked-pill">已鎖定</span>
      </div>
      <div class="progress-track"><div class="progress-bar" :style="{ width: progress + '%' }" /></div>
      <template v-if="currentQuestion">
        <h2 class="question">{{ currentQuestion.prompt }}</h2>
        <div class="choice-list">
          <button
            v-for="option in currentQuestion.options"
            :key="option.id"
            type="button"
            class="choice"
            :class="{ selected: currentAnswer === option.id }"
            :disabled="session?.status !== 'open'"
            @click="choose(option.id)"
          >
            <span class="choice-emoji">{{ option.emoji }}</span>
            <span>{{ option.label }}</span>
          </button>
        </div>
      </template>
      <div class="bottom-actions inline">
        <button class="secondary" type="button" :disabled="questionIndex === 0" @click="previousQuestion">上一題</button>
        <button class="primary" type="button" :disabled="!currentAnswer || busy" @click="nextQuestion">
          {{ questionIndex === QUESTIONS.length - 1 ? '交卷' : '下一題' }}
        </button>
      </div>
    </section>

    <section v-else-if="screen === 'waiting'" class="panel center">
      <div class="hero-emoji">✅</div>
      <div class="eyebrow">答案已經存進資料庫</div>
      <h2>等大家一下</h2>
      <p class="lede">目前 {{ completedCount }} / {{ participants.length }} 人完成。主持人可以隨時揭曉。</p>
      <button v-if="session?.status === 'open'" class="secondary" type="button" @click="editAnswers">我想改答案</button>
      <p v-else class="locked-copy">主持人已鎖定答案，準備揭曉。</p>
    </section>

    <section v-else-if="screen === 'host'" class="panel host-panel">
      <div class="eyebrow">主持人模式</div>
      <h2>房號 {{ session?.code }}</h2>
      <p class="lede">把這個房號給大家。人數不用湊滿 8 個，覺得差不多就可以揭曉。</p>

      <div class="metric-grid">
        <div class="metric"><strong>{{ participants.length }}</strong><span>已加入</span></div>
        <div class="metric"><strong>{{ completedCount }}</strong><span>已完成</span></div>
      </div>

      <div class="people">
        <div v-for="person in participants" :key="person.id" class="person-row">
          <span class="avatar">{{ person.display_name.slice(0, 1).toUpperCase() }}</span>
          <span>{{ person.display_name }}</span>
        </div>
      </div>

      <div v-if="groupStats" class="group-result">
        <div class="eyebrow">結果已固定</div>
        <h3>這局完成了 🎉</h3>
        <p>有效樣本：{{ groupStats[0]?.sampleSize ?? 0 }} 人</p>
      </div>

      <div v-else class="bottom-actions">
        <button class="primary" type="button" :disabled="busy || completedCount === 0" @click="reveal">
          {{ busy ? '正在計算…' : '鎖定並揭曉' }}
        </button>
      </div>
    </section>

    <section v-else-if="screen === 'result'" class="panel result-panel">
      <template v-if="meResult">
        <div class="eyebrow">你的飲食人格</div>
        <div class="persona-emoji">{{ PERSONAS[meResult.persona].emoji }}</div>
        <h2>{{ PERSONAS[meResult.persona].name }}</h2>
        <p class="persona-tagline">「{{ PERSONAS[meResult.persona].tagline }}」</p>

        <div class="match-card">
          <span>👯 靈魂飯友</span>
          <strong>{{ soulmateNames.length ? soulmateNames.join('、') : '這局還沒有可比較的人' }}</strong>
        </div>
        <div class="match-card">
          <span>⚔️ 飲食天敵</span>
          <strong>{{ oppositeNames.length ? oppositeNames.join('、') : '這局還沒有可比較的人' }}</strong>
        </div>
      </template>
    </section>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
  </main>
</template>
