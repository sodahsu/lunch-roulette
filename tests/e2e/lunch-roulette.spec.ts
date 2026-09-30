import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'

type Actor = {
  context: BrowserContext
  page: Page
}

type HostActor = Actor & {
  code: string
}

async function createHost(browser: Browser): Promise<HostActor> {
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('/')
  await page.getByRole('button', { name: '我是主持人，開新局' }).click()

  const roomHeading = page.locator('h2').filter({ hasText: '房號' })
  await expect(roomHeading).toBeVisible()

  const text = await roomHeading.textContent()
  const code = text?.match(/[A-Z2-9]{6}/)?.[0]
  if (!code) throw new Error(`Could not read room code from: ${text}`)

  return { context, page, code }
}

async function joinParticipant(browser: Browser, code: string, name: string): Promise<Actor> {
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(`/?room=${code}`)
  await expect(page.getByRole('heading', { name: '先報上名來' })).toBeVisible()
  await page.getByLabel('暱稱').fill(name)
  await page.getByRole('button', { name: '加入這一局' }).click()
  await expect(page.getByText(/第 1 \/ \d+ 題/)).toBeVisible()

  return { context, page }
}

async function answerAll(page: Page, optionIndex = 0) {
  for (let guard = 0; guard < 20; guard += 1) {
    const choices = page.locator('.choice')
    await expect(choices.first()).toBeVisible()
    await choices.nth(optionIndex).click()

    const progress = page.getByText(/第 \d+ \/ \d+ 題/)
    const before = await progress.textContent()
    const next = page.getByRole('button', { name: /下一題|交卷/ })
    const label = (await next.textContent()) ?? ''
    await next.click()

    if (label.includes('交卷')) {
      await expect(page.getByRole('heading', { name: '你答完了。先不要偷看別人。' })).toBeVisible()
      return
    }

    // saveAnswers 是非同步的：等題號真的換了再點下一題，避免在舊題目上重複點選
    await expect(progress).not.toHaveText(before ?? '')
  }

  throw new Error('Questionnaire did not finish within 20 questions')
}

function joinedMetric(page: Page) {
  return page.locator('.metric').filter({ hasText: '已加入' }).locator('strong')
}

function completedMetric(page: Page) {
  return page.locator('.metric').filter({ hasText: '已完成' }).locator('strong')
}

async function revealDinnerSuccess(page: Page) {
  await page.getByRole('button', { name: '鎖定並揭曉' }).click()
  await expect(page.getByText(/我們這團今晚約成飯的成功率/)).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.locator('.success-score')).toBeVisible()
}

async function flipPersonaCards(page: Page) {
  await page.getByRole('button', { name: /公開處刑/ }).click()
  await expect(page.getByText(/人格卡已同步翻開/)).toBeVisible({
    timeout: 15_000,
  })
}

async function reveal(page: Page) {
  await revealDinnerSuccess(page)
  await flipPersonaCards(page)
}

async function closeActors(...actors: Actor[]) {
  await Promise.all(actors.map((actor) => actor.context.close()))
}

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('CASE-01 先公布晚餐成功率，再同步翻手機人格卡', async ({ browser }) => {
  const host = await createHost(browser)
  const amy = await joinParticipant(browser, host.code, 'Amy')
  const ben = await joinParticipant(browser, host.code, 'Ben')

  try {
    await Promise.all([answerAll(amy.page, 0), answerAll(ben.page, 1)])
    await expect(completedMetric(host.page)).toHaveText('2')

    await revealDinnerSuccess(host.page)
    await expect(host.page.locator('.success-score')).toBeVisible()
    await expect(amy.page.getByText(/全場結算中/)).toBeVisible()
    await expect(ben.page.getByText(/全場結算中/)).toBeVisible()
    await expect(amy.page.getByText('你的飲食人格')).toHaveCount(0)
    await expect(ben.page.getByText('你的飲食人格')).toHaveCount(0)

    await flipPersonaCards(host.page)

    await expect(amy.page.getByText('你的飲食人格')).toBeVisible({ timeout: 15_000 })
    await expect(ben.page.getByText('你的飲食人格')).toBeVisible({ timeout: 15_000 })
    await expect(amy.page.getByText('靈魂飯友')).toBeVisible()
    await expect(ben.page.getByText('飲食天敵')).toBeVisible()
  } finally {
    await closeActors(host, amy, ben)
  }
})

test('CASE-02 未滿 8 人仍可 Reveal', async ({ browser }) => {
  const host = await createHost(browser)
  const actors = await Promise.all([
    joinParticipant(browser, host.code, 'A'),
    joinParticipant(browser, host.code, 'B'),
    joinParticipant(browser, host.code, 'C'),
  ])

  try {
    await Promise.all(actors.map((actor, index) => answerAll(actor.page, index % 2)))
    await expect(joinedMetric(host.page)).toHaveText('3')
    await expect(completedMetric(host.page)).toHaveText('3')

    await reveal(host.page)

    for (const actor of actors) {
      await expect(actor.page.getByText('你的飲食人格')).toBeVisible({ timeout: 15_000 })
    }
  } finally {
    await closeActors(host, ...actors)
  }
})

test('CASE-03 Reveal 前反覆修改，重新整理仍採最後答案', async ({ browser }) => {
  const host = await createHost(browser)
  const participant = await joinParticipant(browser, host.code, 'Latest')

  try {
    await answerAll(participant.page, 0)
    await participant.page.getByRole('button', { name: '修改答案 ↗' }).click()

    const choices = participant.page.locator('.choice')
    await choices.nth(1).click()
    await participant.page.getByRole('button', { name: '下一題' }).click()
    // 題號前進代表 saveAnswers 已完成；否則 reload 會中斷還在傳送的請求
    await expect(participant.page.getByText(/第 2 \/ \d+ 題/)).toBeVisible()

    await participant.page.reload()
    await expect(participant.page.getByRole('heading', { name: '你答完了。先不要偷看別人。' })).toBeVisible()
    await participant.page.getByRole('button', { name: '修改答案 ↗' }).click()

    await expect(participant.page.locator('.choice').nth(1)).toHaveClass(/selected/)

    await reveal(host.page)
    await expect(participant.page.getByText('你的飲食人格')).toBeVisible({ timeout: 15_000 })
  } finally {
    await closeActors(host, participant)
  }
})

test('CASE-04 未完成者不阻塞 Reveal，且不會拿到硬判人格', async ({ browser }) => {
  const host = await createHost(browser)
  const complete = await joinParticipant(browser, host.code, 'Complete')
  const incomplete = await joinParticipant(browser, host.code, 'Incomplete')

  try {
    await answerAll(complete.page, 0)
    await expect(completedMetric(host.page)).toHaveText('1')

    await reveal(host.page)

    await expect(complete.page.getByText('你的飲食人格')).toBeVisible({ timeout: 15_000 })
    await expect(incomplete.page.getByRole('heading', { name: '你沒有答完' })).toBeVisible({
      timeout: 15_000,
    })
  } finally {
    await closeActors(host, complete, incomplete)
  }
})

test('CASE-05 Lock 後 participant 不可繼續修改', async ({ browser }) => {
  const host = await createHost(browser)
  const complete = await joinParticipant(browser, host.code, 'Complete for lock')
  const participant = await joinParticipant(browser, host.code, 'Locked')

  try {
    await answerAll(complete.page, 0)

    await participant.page.locator('.choice').first().click()
    await participant.page.getByRole('button', { name: '下一題' }).click()

    await expect(completedMetric(host.page)).toHaveText('1')
    await host.page.getByRole('button', { name: '鎖定並揭曉' }).click()

    await expect.poll(async () => participant.page.locator('body').innerText(), {
      timeout: 15_000,
    }).toMatch(/全場結算中|你沒有答完/)

    await expect(participant.page.locator('.choice')).toHaveCount(0)
  } finally {
    await closeActors(host, complete, participant)
  }
})

test('CASE-06 Reveal 後 refresh 人格結果一致', async ({ browser }) => {
  const host = await createHost(browser)
  const a = await joinParticipant(browser, host.code, 'Stable A')
  const b = await joinParticipant(browser, host.code, 'Stable B')

  try {
    await Promise.all([answerAll(a.page, 0), answerAll(b.page, 1)])
    await reveal(host.page)

    await expect(a.page.getByText('你的飲食人格')).toBeVisible({ timeout: 15_000 })
    const personaBefore = await a.page.locator('.result-panel h2').textContent()

    await a.page.reload()
    await expect(a.page.getByText('你的飲食人格')).toBeVisible({ timeout: 15_000 })
    await expect(a.page.locator('.result-panel h2')).toHaveText(personaBefore ?? '')
  } finally {
    await closeActors(host, a, b)
  }
})

test('CASE-07 主持人公開結果不洩漏個人逐題答案', async ({ browser }) => {
  const host = await createHost(browser)
  const a = await joinParticipant(browser, host.code, 'Private A')
  const b = await joinParticipant(browser, host.code, 'Private B')

  try {
    await Promise.all([answerAll(a.page, 0), answerAll(b.page, 1)])
    await reveal(host.page)

    const publicText = await host.page.locator('body').innerText()
    expect(publicText).not.toContain('算了，配合大家')
    expect(publicText).not.toContain('不行，今天真的不要')
    expect(publicText).not.toContain('走啊，現在就去')
    expect(publicText).not.toContain('先不要拿晚餐冒險')
  } finally {
    await closeActors(host, a, b)
  }
})

test('CASE-08 第 9 位仍可加入並作答', async ({ browser }) => {
  const host = await createHost(browser)
  const actors: Actor[] = []

  try {
    for (let index = 1; index <= 9; index += 1) {
      actors.push(await joinParticipant(browser, host.code, `P${index}`))
    }

    await expect(joinedMetric(host.page)).toHaveText('9')
    await answerAll(actors[8]!.page, 0)
    await expect(completedMetric(host.page)).toHaveText('1')
  } finally {
    await closeActors(host, ...actors)
  }
})


test('CASE-09 答題中會出現節奏事件', async ({ browser }) => {
  const host = await createHost(browser)
  const participant = await joinParticipant(browser, host.code, 'Pacing')

  try {
    for (let index = 0; index < 3; index += 1) {
      await participant.page.locator('.choice').first().click()
      await participant.page.getByRole('button', { name: '下一題' }).click()
      // 等 saveAnswers 完成、題號前進，避免在舊題目上重複點選
      await expect(participant.page.getByText(new RegExp(`第 ${index + 2} / \\d+ 題`))).toBeVisible()
    }

    await expect(participant.page.getByText('📡 場面觀察')).toBeVisible()
    await expect(participant.page.getByText(/先不要找戰犯/)).toBeVisible()
  } finally {
    await closeActors(host, participant)
  }
})


test('CASE-10 Persona collectible card 會 render 動物插圖與 TYPE', async ({ browser }) => {
  const host = await createHost(browser)
  const participant = await joinParticipant(browser, host.code, 'Card Test')

  try {
    await answerAll(participant.page, 0)
    await reveal(host.page)

    await expect(participant.page.getByText('你的飲食人格')).toBeVisible({ timeout: 15_000 })
    await expect(participant.page.locator('.persona-card')).toBeVisible()
    await expect(participant.page.locator('img.persona-art')).toBeVisible()
    await expect(participant.page.locator('.persona-card-head')).toContainText(/TYPE (0[1-9]|10)/)
    await expect(participant.page.getByText(/MATCH \/ 靈魂飯友/)).toBeVisible()
    await expect(participant.page.getByText(/ENEMY \/ 飲食天敵/)).toBeVisible()
  } finally {
    await closeActors(host, participant)
  }
})

test('CASE-11 房號不存在時提醒使用者，並清掉失效的網址房號', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto('/?room=ZZZZZZ')
    await expect(page.getByRole('alert')).toContainText('找不到房號 ZZZZZZ')
    await expect(page.getByRole('heading', { name: '先報上名來' })).toBeVisible()
    expect(new URL(page.url()).searchParams.has('room')).toBe(false)

    await page.getByLabel('房號').fill('yyyyyy')
    await page.getByLabel('暱稱').fill('Nobody')
    await page.getByRole('button', { name: '加入這一局' }).click()
    await expect(page.getByRole('alert')).toContainText('找不到房號 YYYYYY')
  } finally {
    await context.close()
  }
})

test('CASE-12 結束後主持人可再開一局，參加者可加入新的一局', async ({ browser }) => {
  const host = await createHost(browser)
  const amy = await joinParticipant(browser, host.code, 'Amy')

  try {
    await answerAll(amy.page, 0)
    await reveal(host.page)
    await expect(amy.page.getByText('你的飲食人格')).toBeVisible({ timeout: 15_000 })

    await host.page.getByRole('button', { name: /重新開局/ }).click()
    const heading = host.page.locator('h2').filter({ hasText: '房號' })
    await expect(heading).toHaveText(new RegExp(`房號\\s*(?!${host.code})[A-Z2-9]{6}`))
    const newCode = (await heading.textContent())!.match(/[A-Z2-9]{6}/)![0]
    expect(newCode).not.toBe(host.code)
    await expect(joinedMetric(host.page)).toHaveText('0')

    await amy.page.getByRole('button', { name: /加入新的一局/ }).click()
    await expect(amy.page.getByRole('heading', { name: '先報上名來' })).toBeVisible()
    await amy.page.getByLabel('房號').fill(newCode!)
    await amy.page.getByRole('button', { name: '加入這一局' }).click()
    await expect(amy.page.getByText(/第 1 \/ \d+ 題/)).toBeVisible()
    await expect(joinedMetric(host.page)).toHaveText('1')
  } finally {
    await closeActors(host, amy)
  }
})

test('CASE-13 示意結果頁可用 persona 參數切換，且顯示飯友頭貼與名字', async ({ page }) => {
  await page.goto('/?demo=result&persona=glutton')
  await expect(page.getByRole('heading', { name: '全都要選手' })).toBeVisible()
  await expect(page.locator('img.persona-art')).toBeVisible()
  await expect(page.locator('.match-card').first()).toContainText('Amy')
  await expect(page.locator('.match-card.enemy')).toContainText('Ben')
  await expect(page.locator('.match-people img')).toHaveCount(2)
})

test('CASE-14 稀有卡顯示金色閃卡標示，一般卡不顯示', async ({ page }) => {
  await page.goto('/?demo=result&persona=easygoing&rare=1')
  await expect(page.locator('.persona-card.rare')).toBeVisible()
  await expect(page.locator('.rare-badge')).toContainText('頂級稀有')
  await expect(page.getByText(/本場的頂級稀有卡/)).toBeVisible()
  await expect(page.locator('.rare-reason')).toContainText('稀有原因')
  await expect(page.locator('.rare-reason')).toContainText('純屬運氣')

  await page.goto('/?demo=result&persona=easygoing')
  await expect(page.locator('.persona-card')).toBeVisible()
  await expect(page.locator('.persona-card.rare')).toHaveCount(0)
}
)

test('CASE-15 每一場至少有一位拿到稀有卡，並寫出稀有原因', async ({ browser }) => {
  const host = await createHost(browser)
  const amy = await joinParticipant(browser, host.code, 'Amy')
  const ben = await joinParticipant(browser, host.code, 'Ben')

  try {
    await Promise.all([answerAll(amy.page, 0), answerAll(ben.page, 1)])
    await reveal(host.page)
    await expect(amy.page.getByText('你的飲食人格')).toBeVisible({ timeout: 15_000 })
    await expect(ben.page.getByText('你的飲食人格')).toBeVisible({ timeout: 15_000 })

    const rareCount =
      (await amy.page.locator('.persona-card.rare').count()) +
      (await ben.page.locator('.persona-card.rare').count())
    expect(rareCount).toBeGreaterThanOrEqual(1)

    const rarePage = (await amy.page.locator('.persona-card.rare').count()) > 0 ? amy.page : ben.page
    await expect(rarePage.locator('.rare-reason')).toContainText('稀有原因')
  } finally {
    await closeActors(host, amy, ben)
  }
})
