import { describe, expect, it } from 'vitest'
import { PERSONAS } from './questions'
import { groupShareCard, personaShareCard, shareCardText } from './share-card'
import type { PersonaKey } from './types'

describe('分享卡隱私', () => {
  it('只輸出人格與稀有度，不帶入配對或其他結果', () => {
    const result = {
      persona: 'easygoing' as const,
      rare: true,
      soulmates: [{ participantId: '其他玩家', similarity: 1 }],
      opposites: [{ participantId: '另一玩家', similarity: 0 }],
      rareReason: '私人額外資料',
    }
    expect(shareCardText(result)).toEqual({
      name: '真・都可以',
      tagline: '我真的都可以，兔兔發誓，不騙你。',
      rarity: '★ SSR · 頂級稀有',
    })
  })
})

describe('人格卡欄位', () => {
  it('帶出對應插圖的人格 key 與稀有旗標，欄位為固定白名單', () => {
    const result = {
      persona: 'glutton' as const,
      rare: true,
      soulmates: [{ participantId: '其他玩家', similarity: 1 }],
      opposites: [{ participantId: '另一玩家', similarity: 0 }],
      rareReason: '私人額外資料',
    }
    const card = personaShareCard(result)
    expect(Object.keys(card).sort()).toEqual(['name', 'persona', 'rare', 'rarity', 'tagline'])
    expect(card).toMatchObject({ persona: 'glutton', rare: true, rarity: '★ SSR · 頂級稀有' })
    expect(JSON.stringify(card)).not.toMatch(/其他玩家|另一玩家|私人額外資料/)
  })

  it('一般卡的 rare 為 false，舊資料沒有 rare 欄位也視為一般卡', () => {
    expect(personaShareCard({ persona: 'picky', rare: false }).rare).toBe(false)
    expect(personaShareCard({ persona: 'picky' }).rare).toBe(false)
    expect(personaShareCard({ persona: 'picky' }).rarity).toBe('DINNER IDENTITY')
  })

  it('十種人格都有名稱與金句', () => {
    for (const key of Object.keys(PERSONAS) as PersonaKey[]) {
      const card = personaShareCard({ persona: key })
      expect(card.name).toBe(PERSONAS[key].name)
      expect(card.tagline.length).toBeGreaterThan(0)
    }
  })
})

describe('團體成功率卡', () => {
  const date = new Date(2026, 10, 8, 20, 30)

  it('只輸出成功率、verdict、有效人數與日期', () => {
    const card = groupShareCard({
      score: 87,
      verdict: '今晚直接出門，不要再討論',
      sampleSize: 5,
      date,
    })
    expect(card).toEqual({
      kicker: '都可以？ / GROUP RESULT',
      title: '我們這團今晚約成飯的成功率',
      score: 87,
      scoreText: '87%',
      verdict: '今晚直接出門，不要再討論',
      sampleText: '有效樣本 5 人',
      dateText: '2026-11-08',
    })
  })

  it('不得含任何暱稱：即使呼叫端多塞參加者資料，輸出也不會帶出', () => {
    const polluted = {
      score: 62,
      verdict: '約得成，但不要再開全民表決',
      sampleSize: 3,
      date,
      participants: [{ display_name: 'Amy' }, { display_name: 'Ben' }],
      displayNames: ['Amy', 'Ben'],
      personas: { Amy: 'glutton' },
      soulmates: [{ participantId: 'Amy', similarity: 1 }],
      roomCode: 'ABC234',
    }
    const card = groupShareCard(polluted)
    expect(card).not.toBeNull()
    expect(Object.keys(card!).sort()).toEqual([
      'dateText',
      'kicker',
      'sampleText',
      'score',
      'scoreText',
      'title',
      'verdict',
    ])
    expect(JSON.stringify(card)).not.toMatch(/Amy|Ben|glutton|ABC234|participant/i)
  })

  it('有效樣本少於兩位時不產生卡片，不把缺少樣本畫成 0%', () => {
    expect(groupShareCard({ score: 0, verdict: '先不要急著訂位', sampleSize: 1, date })).toBeNull()
    expect(groupShareCard({ score: 0, verdict: '先不要急著訂位', sampleSize: 0, date })).toBeNull()
  })

  it('兩位即可產生，並把成功率限制在 0–100 的整數', () => {
    expect(groupShareCard({ score: 100, verdict: 'v', sampleSize: 2, date })?.scoreText).toBe('100%')
    expect(groupShareCard({ score: 0, verdict: 'v', sampleSize: 2, date })?.scoreText).toBe('0%')
    expect(groupShareCard({ score: 86.6, verdict: 'v', sampleSize: 2, date })?.scoreText).toBe('87%')
    expect(groupShareCard({ score: 140, verdict: 'v', sampleSize: 2, date })?.scoreText).toBe('100%')
    expect(groupShareCard({ score: -5, verdict: 'v', sampleSize: 2, date })?.scoreText).toBe('0%')
  })

  it('日期補零並使用本地時區', () => {
    expect(
      groupShareCard({ score: 70, verdict: 'v', sampleSize: 4, date: new Date(2026, 0, 5, 23, 59) })?.dateText,
    ).toBe('2026-01-05')
  })
})
