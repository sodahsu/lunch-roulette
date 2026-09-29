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

    const next = page.getByRole('button', { name: /下一題|交卷/ })
    const label = (await next.textContent()) ?? ''
    await next.click()

    if (label.includes('交卷')) {
      await expect(page.getByRole('heading', { name: '等大家一下' })).toBeVisible()
      return
    }
  }

  throw new Error('Questionnaire did not finish within 20 questions')
}

function joinedMetric(page: Page) {
  return page.locator('.metric').filter({ hasText: '已加入' }).locator('strong')
}

function completedMetric(page: Page) {
  return page.locator('.metric').filter({ hasText: '已完成' }).locator('strong')
}

async function reveal(page: Page) {
  await page.getByRole('button', { name: '鎖定並揭曉' }).click()
  await expect(page.getByText(/你們這團可以出去吃飯嗎/)).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.locator('.group-verdict')).toContainText(/可以.*出去吃飯/)
}

async function closeActors(...actors: Actor[]) {
  await Promise.all(actors.map((actor) => actor.context.close()))
}

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('CASE-01 多人正常流程：作答、Reveal、手機同步人格卡', async ({ browser }) => {
  const host = await createHost(browser)
  const amy = await joinParticipant(browser, host.code, 'Amy')
  const ben = await joinParticipant(browser, host.code, 'Ben')

  try {
    await Promise.all([answerAll(amy.page, 0), answerAll(ben.page, 1)])
    await expect(completedMetric(host.page)).toHaveText('2')

    await reveal(host.page)

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
    await participant.page.getByRole('button', { name: '我想改答案' }).click()

    const choices = participant.page.locator('.choice')
    await choices.nth(1).click()
    await participant.page.getByRole('button', { name: '下一題' }).click()

    await participant.page.reload()
    await expect(participant.page.getByRole('heading', { name: '等大家一下' })).toBeVisible()
    await participant.page.getByRole('button', { name: '我想改答案' }).click()

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
