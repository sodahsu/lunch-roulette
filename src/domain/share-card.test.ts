import { describe, expect, it } from 'vitest'
import { shareCardText } from './share-card'

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
