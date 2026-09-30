---
title: "Lunch Roulette《都可以？》｜AI 工作交接"
date: "2026-09-29"
handoff_status: ready_for_handoff
---

# Lunch Roulette《都可以？》｜AI 工作交接

## Resume Here

**交付定位：**核心多人遊戲、兩段式 Reveal、防冷場 pacing、Dark Editorial 視覺與 OpenSpec 已實作；下一步重點是 runtime / 多裝置 / 部署驗證，不要再把視覺改版列為未開始。

**功能實作快照 HEAD（本次 HANDOFF 更新前）：** `7981d6b257507973b46d46038c1aa874b733fa3d`

```yaml
handoff_purpose: implementation_and_validation
task_state: implementation_written_runtime_unverified
code_changed: true
repository_reverified: true
visual_redesign: implemented_runtime_unverified
```

## 1. 產品一句話

《都可以？》不是餐廳推薦器，而是多人飯局人格社交遊戲。

核心：

> 8 個人都說自己很好約，最後看看這團今晚到底有多大機會真的約成一頓飯，以及誰才是真的「都可以」。

---

## 2. 正式遊戲流程

```text
Host 開房
↓
大螢幕 QR / 房號
↓
Participants 手機加入
↓
輸入暱稱
↓
v0.2：24 題題庫 deterministic 抽本局 12 題
↓
大家答題
├─ 第 4 題：場面觀察
├─ 第 8 題：中場警報
└─ 第 11 題：最後兩題
↓
先完成的人進 waiting
↓
Host 按「鎖定並揭曉」
↓
session = locked
↓
所有手機保持等待
↓
大螢幕 3 / 2 / 1
↓
成功率三拍 Reveal
1. 幾個人自認「超好約」
2. 「但答案比你們誠實」
3. 今晚約成飯的成功率 + verdict
↓
session 仍然 locked
↓
Host 按「公開處刑 🎴」
↓
persist group snapshot + participant results
↓
session = revealed
↓
完成者手機 Realtime 自動翻人格卡
↓
靈魂飯友 / 飲食天敵
↓
大螢幕：
「全部把手機舉起來」
↓
現場互相找飯友 / 天敵
```

---

## 3. 已實作功能清單｜FACT

### Session / Multiplayer

- [x] Host 建立房間。
- [x] 6 碼房號。
- [x] QR Code 加入。
- [x] 暱稱加入，不需要一般帳密註冊流程。
- [x] 約 8 人是主要規模，但不是 hard limit。
- [x] 第 9 人仍可加入。
- [x] Realtime participant / response / result 更新。
- [x] `open → locked → revealed` 狀態模型。
- [x] locked / revealed 後禁止新 participant。
- [x] locked 後禁止答案修改。
- [x] Host 不需要等所有 participant 完成即可 Reveal，但至少需 1 位完成者。

### Questionnaire v0.2

- [x] 24 題題庫。
- [x] 6 類，每類 4 題。
- [x] 每房 deterministic 抽 12 題。
- [x] 每類固定 2 題。
- [x] `self-image` 每局必出。
- [x] 同一房間所有人取得同一組題目與順序。
- [x] Reload 不換題。
- [x] v0.1 legacy room 保留原 8 題。
- [x] Complete 判定只依 active questionnaire。

### Persona / Matching

- [x] 10 種 Persona。
- [x] 動物 emoji persona identity。
- [x] Option score 加總。
- [x] Highest score wins。
- [x] Tie 使用固定 `PERSONA_PRIORITY`。
- [x] 不使用 threshold。
- [x] Persona deterministic。
- [x] Similarity = active questions 完全相同答案比例。
- [x] 靈魂飯友 = highest similarity。
- [x] 飲食天敵 = lowest similarity。
- [x] 並列全部保留。
- [x] 不與自己 pairing。
- [x] Incomplete participant 不硬判 persona。

### 今晚約成飯的成功率

Domain owner：

`calculateDinnerSuccessRate()`

公式：

```text
questionAgreement = max(optionCounts) / sampleSize

Dinner Success Rate
= round(mean(questionAgreement) * 100)
```

Verdict：

| Score | 顯示 |
|---:|---|
| 80–100 | 今晚直接出門，不要再討論 |
| 68–79 | 今晚約得成，找一個人負責訂位 |
| 56–67 | 約得成，但不要再開全民表決 |
| 0–55 | 有機會約成，先指定飯局隊長 |

- [x] 這是 deterministic **game score**。
- [x] 不宣稱是統計校準過的真實事件機率。
- [x] 少於 2 位 complete participants 顯示「樣本不足」，不是誤導性的 `0%`。

---

## 4. Reveal Contract｜禁止改壞

### Stage A｜大螢幕

```text
Host：鎖定並揭曉
↓
open → locked
↓
Participants 全部 waiting
↓
3 / 2 / 1
↓
成功率三拍 Reveal
```

此時：

- session **必須仍是 `locked`**。
- participant 手機 **不得出現 Persona**。
- `participant_results` 不應因成功率畫面提前曝光。

### Stage B｜手機人格

只有 Host 按：

> **公開處刑 🎴**

才：

```text
finalizeReveal()
↓
persist result_snapshots
↓
persist participant_results
↓
locked → revealed
↓
Realtime
↓
手機自動 Persona
```

Stable constraints：

- [x] `finalizeReveal()` 只由 final Persona Reveal 觸發。
- [x] Host 未公開處刑前，participant 不得看到 Persona。
- [x] 手機不需要另外按「查看結果」。
- [x] 手機 Persona 頁專心顯示個人結果，不重複團體成功率。
- [x] Public Host 畫面不可揭露「某人某題選什麼」。

---

## 5. 防冷場 Pacing｜已實作

### Join / Lobby

Host 會依目前狀態顯示趣味文案，例如：

- 「等待第一位受害者掃碼…」
- 「目前 6 個人聲稱自己很好約。」
- 「5 人已交卷，還有 2 人正在跟自己辯論。」

只使用公開的 join / completion counts。

### Quiz

固定節奏點：

- [x] 第 4 題：場面觀察。
- [x] 第 8 題：中場警報。
- [x] 第 11 題：最後兩題。

這些 event：

- 不改答案。
- 不改 scoring。
- 不引用個人真實選項。
- 純 UI pacing。

### Waiting

Participant 交卷後：

- 顯示完成比例。
- 依剩餘人數吐槽。
- Session open 時仍可回去修改答案。

### Success Reveal

不是：

`3 → 2 → 1 → 78%`

而是：

```text
7 / 8 人自認「超好約」
↓
但答案比你們誠實
↓
實際成功率是……
↓
78%
↓
今晚約得成，找一個人負責訂位
```

### Persona Reveal 後

Host 大螢幕：

> 全部把手機舉起來。  
> 先找到你的靈魂飯友，再找飲食天敵。

---

# 6. 視覺系統｜IMPLEMENTED / RUNTIME UNVERIFIED

使用者已明確要求：

> **設計風格要酷酷的。**

目前程式已改為正式 Dark Editorial 視覺系統。以下規格是目前 code 的視覺 contract；仍需 browser / device runtime QA 才能標記視覺驗收 PASS。

目前 runtime 支援 10 種 Persona；優先使用 `src/assets/personas/*.webp`，缺圖時由 `src/components/PersonaGlyph.vue` 提供 inline SVG fallback，不依賴外部圖片 CDN。後面的 Prompt Library 保留作為未來資產升級的 source brief，不是目前 runtime dependency。

## Target Direction

**Dark Editorial × Food Personality × Social Experiment**

一句話：

> **黑色設計展 × 飯局社交實驗 × 動物人格收藏卡**

### Visual Keywords

- dark editorial
- social experiment
- collectible card
- food personality
- contemporary design exhibition
- restrained absurdity
- bold typography
- high contrast
- experimental dashboard
- sophisticated animal character

### Color direction

建議基礎：

```text
Background      #0B0B0C
Surface         #151517
Surface 2       #202024
Primary text    #F5F5F2
Muted text      #8E8E93

Electric Blue   #4C6FFF
Acid Lime       #C7FF3D
Alert Red       #FF493D
```

Accent 不要大量彩虹化。

## 視覺實作 Checklist

### Global

- [x] 米白背景改成深色 editorial system。
- [x] 建立統一 dark surface / border / typography tokens。
- [x] 降低大圓角與「可愛 App」感。
- [x] 大量使用 oversized typography。
- [x] Emoji 只做輔助，不作為主要品牌視覺。
- [x] 保留高對比與 focus-visible；WCAG 仍待 runtime / audit 驗證。
- [x] 保持 mobile-first。
- [x] 保持 `prefers-reduced-motion`。

### Landing

目標：

```text
10/1 SOCIAL EXPERIMENT

都
可
以
？

8 個人都說自己很好約。
今晚看看誰在說謊。
```

- [x] 移除首頁巨大 🍜 emoji 主視覺。
- [x] 「都可以？」改成巨大 typography。
- [x] Primary CTA：加入飯局。
- [x] Host Mode 降低視覺權重。
- [x] 不做一般 SaaS hero。

### Host Lobby

目標像：

**Social Experiment Control Room**

- [x] QR 做成主視覺之一。
- [x] Room code 超大字。
- [x] Participant list 改成 experimental roster。
- [x] READY / THINKING 狀態更像儀表板。
- [x] 已採 subject roster / LIVE control-room 語言；未額外增加瞬時 join toast。
- [ ] 遠距離投影易讀性需實機 QA。

### Quiz

- [x] 一題一屏。
- [x] A / B 選項改成大型矩形。
- [x] 選中採 Acid Lime 高反差 invert。
- [x] 降低 rounded card feel。
- [x] 第 4 / 8 / 11 題 event 改成 1.8 秒 full-screen interstitial。

Event visual direction：

```text
MINORITY DETECTED

有人開始逆風了。
先不要找戰犯。
```

```text
CONSENSUS
IS
COLLAPSING

共識正在崩壞。
```

```text
FINAL
TWO

友情還有兩題可以挽救。
```

### Dinner Success Reveal

這是全場最大視覺高潮。

- [x] 減少 dashboard 卡片。
- [x] 每一拍只呈現一個核心訊息。
- [x] 自認好約人數 → 單獨一拍。
- [x] 「答案比你們誠實」→ 單獨一拍。
- [x] Success Rate → 超大型 typography。
- [x] Dinner success copy 採 secondary label / eyebrow hierarchy。
- [x] 「公開處刑」成為 Alert Red final CTA。
- [x] 不做過度 Cyberpunk neon animation。

### Persona Card

目標：

**Collectible Identity Card**

Card 可以包含：

```text
TYPE 06

[Animal Character]

五百公尺極限派
HOME RADIUS TYPE

超過兩個路口，就是遠。

MATCH   AMY
ENEMY   KEVIN
```

- [x] 卡片使用統一黑 / 白 / Electric Blue 系統。
- [x] 每個 Persona 只換局部識別色。
- [x] 不做 10 張完全不同的彩虹 theme。
- [x] 10 個 runtime Persona 使用一致的 asset / inline SVG fallback 視覺語言。
- [x] Runtime glyph 採 editorial geometric animal，不走兒童卡通。
- [x] Persona Card 已採 collectible identity card composition；實機 screenshot QA 待驗證。
- [ ] 手機 375px 小尺寸仍需 runtime QA。
- [ ] 未來若整合生成圖，圖片不要含文字、Logo、UI、浮水印。

### Avoid

不要做成：

- [ ] 紫粉 AI SaaS。
- [ ] Cyberpunk 滿版霓虹。
- [ ] 彩虹遊戲 UI。
- [ ] 每個 Persona 一套完全不同配色。
- [ ] 兒童卡通風。
- [ ] Apple Fitness 彩色圓環。
- [ ] 一堆 dashboard 小卡。
- [ ] 一般餐廳推薦 App。

## 6.1 Visual Prompt Library｜可直接拿去生圖

這一節是 **visual generation source brief**。  
這一節是目前 10 個 runtime Persona 的資產 source brief；runtime 仍優先使用 `src/assets/personas/*.webp`，缺圖時使用 inline SVG fallback。

### 使用規則

1. 角色圖本身 **不要產生文字**；Persona 名稱、TYPE、MATCH、ENEMY 全由前端疊字。
2. 所有 10 個角色必須維持：
   - 相同鏡位。
   - 相同材質。
   - 相同燈光。
   - 相同角色比例。
   - 相同輪廓語言。
   - 相同背景邏輯。
3. 差異只放在：
   - 動物。
   - 姿勢。
   - 食物／餐桌象徵物。
   - 一個局部識別 accent。
4. 不要讓角色變成兒童吉祥物。
5. 不要生成品牌 UI、App screenshot、Logo、浮水印或可讀文字。
6. Persona card 最終會放在手機，因此角色輪廓在小尺寸必須仍可辨識。
7. 如果一次產生整組，優先要求 **one coherent visual system, ten clearly distinct characters**，不要十張各自發揮。
8. 如果分開生圖，每次都要帶上 Shared Style Prompt。

---

### Shared Style Prompt｜全系列共用母版

```text
A sophisticated animal character illustration for a dark editorial social-experiment game about group dining personalities.

Visual language: dark editorial, collectible identity card, contemporary design exhibition, playful but sophisticated, slightly absurd, modern Taiwanese youth culture, restrained humor, bold silhouette, premium graphic illustration, soft 3D sticker-like material, tactile matte surface, subtle depth, clean studio lighting, precise edges, high contrast.

Art direction: black and charcoal visual system with off-white highlights, electric blue as the main shared accent, one restrained secondary accent per character, minimal composition, strong negative space, gallery-poster sensibility, fashion-editorial attitude rather than children's cartoon.

Character treatment: one stylized animal as the clear focal subject, expressive posture but not exaggerated kawaii proportions, compact readable silhouette, confident personality, food-related prop or dining behavior used as a visual metaphor, front three-quarter view, consistent camera angle and scale across the full series.

Composition: centered or slightly off-center hero character, simple dark background or transparent-ready isolated composition, enough empty space around the subject for frontend typography, mobile-readable at small size.

Do not render any words, letters, numbers, logos, app interface, cards with readable text, watermarks, brand marks, photorealistic humans, childish mascot proportions, rainbow palette, glossy mobile-game aesthetic, excessive neon cyberpunk lighting, anime style, or generic restaurant advertising.
```

---

### Shared Persona Card Prompt｜人格卡構圖模板

在 Shared Style Prompt 後面加：

```text
Create this as a collectible identity-card hero asset, not a full card UI. Show only the illustrated character and a few abstract graphic shapes. Keep the lower and upper edges visually clean so the frontend can overlay TYPE number, Chinese persona name, English subtype, tagline, MATCH and ENEMY information. The image itself must contain no text.
```

建議：

- Persona 主圖：`1:1` 或 `4:5`。
- 手機卡需要裁切彈性時，角色不要貼邊。
- 優先透明背景；若透明效果不穩，使用純深灰／黑背景，再由前端整合。

---

## 6.2 八個 Persona 生圖 Prompt

### 01｜和平飯友 🦦 Otter

人格：

> 吃什麼都可以，拜託不要再討論了。

在 Shared Style Prompt 後追加：

```text
Character: an otter representing the Peacekeeper dining personality.

Pose and metaphor: calm seated posture, gently holding two different food plates as if trying to keep both sides happy, relaxed shoulders, subtle tired-but-patient expression, balancing conflicting choices without drama.

Personality feeling: diplomatic, agreeable, quietly exhausted by endless discussion.

Food cues: two contrasting meal choices presented symmetrically, minimal and abstract rather than realistic food photography.

Accent: restrained electric blue with a tiny warm neutral accent.

Avoid making the otter cute or childish; it should feel like a witty editorial character from a contemporary design exhibition.
```

### 02｜逆風美食家 🐺 Wolf

人格：

> 大家往東，我偏偏往西。

追加：

```text
Character: a wolf representing the Contrarian dining personality.

Pose and metaphor: the wolf confidently stepping in the opposite direction from a set of abstract arrows or plates, one paw casually pointing away from the group choice, sharp composed posture rather than aggressive attack.

Personality feeling: independent, opinionated, cool, knowingly difficult, enjoys choosing differently.

Food cues: one distinctive plate separated from several identical plates.

Accent: restrained alert red against the shared black and electric-blue system.

Keep the attitude editorial and stylish, not villainous, violent, furry-fandom, or cartoonish.
```

### 03｜挑食王 🐈 Cat

人格：

> 不是我難搞，是選項真的不行。

追加：

```text
Character: a cat representing the Picky Eater personality.

Pose and metaphor: composed cat inspecting a plate with suspicious precision, one paw slightly pushing an unacceptable ingredient away, elegant unimpressed expression.

Personality feeling: selective, discerning, high standards, dry humor, absolutely convinced the problem is the food rather than the person.

Food cues: carefully separated ingredients, one rejected garnish or suspicious item.

Accent: cool silver with a restrained acid-lime detail.

Avoid princess imagery, childish fussiness, angry tantrums, or overt luxury branding.
```

### 04｜新店敢死隊 🦊 Fox

人格：

> Google 評論只有三則？走啊。

追加：

```text
Character: a fox representing the Adventurer dining personality.

Pose and metaphor: forward-leaning fox about to enter an unknown doorway or reach for a mysterious covered dish, alert ears, curious confident stance, a sense of voluntary risk.

Personality feeling: exploratory, impulsive, curious, first-to-try, slightly reckless but charismatic.

Food cues: mystery dish, unfamiliar menu shapes, small unknown doorway or location marker used only as abstract symbols.

Accent: electric blue plus restrained warm orange.

Do not make it fantasy-adventure, treasure-hunt, anime, or children's storybook.
```

### 05｜CP 值守門員 🐿️ Squirrel

人格：

> 不是不能吃貴，是要值得。

追加：

```text
Character: a squirrel representing the Value Hunter dining personality.

Pose and metaphor: focused squirrel comparing two plates with a tiny abstract balance-scale gesture, one premium-looking plate and one practical plate, analytical but not miserly.

Personality feeling: sharp, rational, value-sensitive, proud of finding the best tradeoff.

Food cues: neatly arranged portions, subtle token or geometric value markers without currency symbols or text.

Accent: electric blue with restrained amber.

Avoid accountant clichés, piles of coins, cheap-shopping imagery, or cartoon acorns as the main joke.
```

### 06｜五百公尺極限派 🐢 Turtle

人格：

> 超過兩個路口，就是遠。

追加：

```text
Character: a turtle representing the Homebody / short-distance dining personality.

Pose and metaphor: turtle comfortably settled at a tiny table extremely close to its shell, while a distant glowing restaurant-like shape sits far away in the background, clearly uninterested in traveling.

Personality feeling: comfortable, stubborn about distance, efficient, dryly self-aware.

Food cues: nearby simple meal versus distant premium-looking meal.

Accent: acid lime within the shared dark and electric-blue system.

Avoid sleepy old-person stereotypes, childish turtle mascot styling, or outdoor hiking imagery.
```

### 07｜美食狂熱者 🐻 Bear

人格：

> 好吃的話，排四十分鐘也可以。

追加：

```text
Character: a bear representing the Food Fanatic personality.

Pose and metaphor: focused bear waiting patiently behind a minimal queue barrier while staring intensely at one exceptional dish in the distance, clearly willing to suffer for good food.

Personality feeling: passionate, committed, food-obsessed, serious about taste.

Food cues: one visually magnetic hero dish, subtle queue markers, no restaurant branding.

Accent: electric blue with a restrained deep orange or red detail.

Avoid gluttony stereotypes, messy overeating, chef costumes, or comedic fat-character treatment.
```

### 08｜真・都可以 🐶 Dog

人格：

> 傳說中的真的都可以。

追加：

```text
Character: a dog representing the Truly Easygoing dining personality.

Pose and metaphor: relaxed confident dog surrounded by several different food choices, genuinely comfortable with all of them, open posture, no indecision or anxiety.

Personality feeling: adaptable, cheerful without being childish, low-friction, socially easy, the rare person who actually means 'anything is fine'.

Food cues: several clearly different meal silhouettes arranged with equal visual weight.

Accent: the cleanest and strongest electric blue treatment in the full series.

Avoid generic happy puppy mascot energy; make it calm, stylish, contemporary and editorial.
```

---

## 6.3 Persona 系列一次生成 Prompt

如果生成工具能一次產生多張／多角色，可使用：

```text
Create a coherent series of eight distinct animal dining-personality characters for the same dark editorial social-experiment game.

Characters:
1. Otter — Peacekeeper: balancing two conflicting food choices.
2. Wolf — Contrarian: confidently choosing the opposite direction.
3. Cat — Picky Eater: precisely rejecting one ingredient.
4. Fox — Adventurer: eager to try an unknown restaurant or mystery dish.
5. Squirrel — Value Hunter: comparing value between two meals.
6. Turtle — Homebody: choosing the meal that is closest.
7. Bear — Food Fanatic: willing to wait for an exceptional dish.
8. Dog — Truly Easygoing: genuinely comfortable with every option.

All eight must share exactly the same camera angle, scale, lighting, soft 3D matte sticker material, dark editorial art direction, electric-blue visual system, clean background, sophisticated graphic language and collectible-card sensibility.

They must be immediately distinguishable by silhouette and posture but clearly belong to one designed family.

Modern Taiwanese youth-culture energy, playful but sophisticated, slightly absurd, gallery-exhibition quality, screenshot-worthy on mobile.

No text, no letters, no numbers, no logos, no UI, no watermarks, no rainbow palette, no kawaii children's mascot style, no anime, no photorealism, no brand references.
```

---

## 6.4 Landing Hero Prompt

用途：首頁主視覺；文字全部由前端排版。

```text
A dark editorial hero illustration for a social dining experiment called conceptually 'anything is fine?', without rendering any text.

Scene: a small group of sophisticated stylized animal silhouettes gathered around a dining table, each subtly pulling toward a different food choice while pretending to be relaxed. The tension should be funny but understated, like a visual joke about group decision-making.

Visual language: contemporary design exhibition, black gallery space, electric-blue directional lines, restrained acid-lime accents, bold negative space, soft 3D sticker-like animal material mixed with crisp graphic shapes, high-contrast editorial composition.

Mood: cool, clever, socially awkward, slightly absurd, designed for creative professionals rather than children.

Composition must leave large intentional empty areas for oversized frontend typography.

No visible words, no logos, no restaurant branding, no app UI, no watermarks, no excessive food clutter, no colorful party-game aesthetic, no neon cyberpunk city.
```

---

## 6.5 Dinner Success Reveal Prompt

用途：大螢幕成功率 Reveal 的抽象背景／輔助視覺。  
主角仍應是前端的大型數字，不要讓圖片搶掉 `78%`。

```text
An abstract editorial visual for the climax of a group dining social experiment.

Concept: group consensus being measured and compressed into one decisive outcome. Use converging and diverging paths, vote-like geometric clusters, table-position dots and one strong electric-blue route resolving through the composition.

Style: black background, high contrast, minimal contemporary exhibition graphics, restrained acid-lime and alert-red accents, precise geometry, subtle soft 3D depth, dramatic negative space.

The composition should feel tense and intelligent, not technical or corporate. It must support an oversized percentage number overlaid by the frontend.

No text, no numbers, no charts with labels, no app interface, no logos, no casino imagery, no generic AI glowing brain, no cyberpunk city.
```

---

## 6.6 Pacing Event Prompt Library

### Event A｜MINORITY DETECTED

```text
Dark editorial interstitial background representing one choice breaking away from the group: seven compact abstract marks moving together while one distinct mark sharply diverges. Black background, electric blue majority path, one restrained alert-red divergent mark, huge negative space, contemporary design exhibition aesthetic, tense but funny, minimal.

No text or numbers; frontend will overlay the event copy.
```

### Event B｜CONSENSUS IS COLLAPSING

```text
Dark editorial interstitial background visualizing group consensus splitting into two nearly equal directions. A clean electric-blue path fractures into two balanced branches, with subtle acid-lime tension markers. Minimal, dramatic, graphic, contemporary exhibition design, slightly absurd social-experiment energy.

No text, no numbers, no UI, no logos.
```

### Event C｜FINAL TWO

```text
Dark editorial interstitial background for the final two questions of a social experiment. Two bold remaining checkpoints float in a nearly empty black composition, connected by one electric-blue line approaching a final decision gate. Minimal, high tension, premium graphic design, strong negative space.

No text, no numbers, no countdown digits, no UI, no logos.
```

---

## 6.7 Global Negative Prompt｜全系列禁止項目

若工具支援 Negative Prompt，可使用：

```text
readable text, typography inside image, letters, numbers, logo, watermark, app UI, phone mockup, website screenshot, restaurant brand, food delivery branding, photorealistic human, child character, baby animal, kawaii mascot, chibi proportions, anime, manga, Pixar-like family animation, children's book illustration, rainbow palette, pastel rainbow, purple-pink AI gradient, excessive neon, cyberpunk city, gaming HUD, casino, slot machine, glossy mobile-game asset, emoji-only character, cluttered composition, busy background, stock illustration, clip art, generic corporate vector art, overly cute facial expression, exaggerated slapstick, gore, violence
```

如果工具不支援獨立 Negative Prompt，就把以下句子接在每個 prompt 尾端：

```text
Avoid all readable text, logos, UI, watermarks, childish mascot styling, rainbow palettes, purple-pink AI gradients, excessive cyberpunk neon, anime, photorealism, stock-vector aesthetics and generic restaurant advertising.
```

---

## 6.8 生成資產驗收 Checklist

每一批 Persona 資產生成後，不要只挑「最好看」的單張，要先檢查整組一致性：

- [ ] 8 隻動物一眼可辨識。
- [ ] 8 張相同鏡位／光線／材質。
- [ ] 角色大小差異合理，不會有一張突然超近景。
- [ ] 黑 / 白 / Electric Blue 是共同主系統。
- [ ] Accent 只做局部識別。
- [ ] 沒有生成任何可讀文字。
- [ ] 沒有 Logo / UI / 浮水印。
- [ ] 沒有兒童卡通感。
- [ ] 手機縮到小尺寸仍看得懂輪廓。
- [ ] 能安全裁成 1:1 / 4:5。
- [ ] Persona 名稱與角色視覺語意一致。
- [ ] 圖片留有足夠 negative space 給前端排字。
- [ ] 全系列放在一起時像同一場設計展，而不是八個不同 prompt 拼起來。

---

---

## 7. OpenSpec

目前已同步：

- `openspec/changes/lunch-roulette-mvp/proposal.md`
- `openspec/changes/lunch-roulette-mvp/design.md`
- `openspec/changes/lunch-roulette-mvp/tasks.md`
- `specs/live-session/spec.md`
- `specs/preference-quiz/spec.md`
- `specs/result-reveal/spec.md`

FACT：

- 兩段式 Reveal 已進 spec。
- 防冷場 pacing 已進 spec。
- v0.2 24 → 12 題題組已進 spec。

PENDING：

- 視覺 dark-editorial redesign **尚未寫進正式 OpenSpec capability requirement**。
- 若下一輪開始實作視覺，需同步 design/tasks；純視覺 token 可留 design，若改變 interaction behavior 則同步 capability spec。

---

## 8. Automated Test Code

已寫：

- [x] Vitest domain tests。
- [x] Playwright CASE-01～18 test code（CASE-17 / 18 已加入；最新 HEAD 尚未完整重跑）。
- [x] CASE-11～16 覆蓋失效房號、重新開局、示意 Persona、稀有卡與 food consensus；CASE-17 / 18 覆蓋 Host overview responsive layout 與音效偏好。

重點：

### CASE-01

```text
Host lock
↓
成功率先出
↓
Participants 仍 waiting
↓
Persona 不存在
↓
Host 公開處刑
↓
手機同步 Persona
```

### CASE-09

- 驗證第 4 題 pacing event 出現。

注意：

**Test code 已寫 ≠ runtime PASS。**

---

## 9. Runtime Validation Checklist

目前狀態：

| 驗證 | 狀態 |
|---|---|
| `pnpm install --frozen-lockfile` | VERIFIED（2026-09-30） |
| lockfile 產生 | 已存在並通過 frozen install |
| `pnpm test:unit` | VERIFIED：33 項通過（2026-09-30） |
| `pnpm typecheck` | VERIFIED（2026-09-30） |
| `pnpm build` | VERIFIED（2026-09-30） |
| `pnpm test:e2e` | PREVIOUSLY VERIFIED：較早 HEAD 16 項通過（2026-09-30）；最新 HEAD 已新增 CASE-17 / 18，需重跑 |
| Supabase project health | VERIFIED: ACTIVE_HEALTHY |
| Supabase Security Advisor | VERIFIED: 0 security lints |
| Anonymous Sign-ins runtime | UNKNOWN：目前 auth.users 尚無 anonymous user evidence |
| 真實多裝置 Reveal | NOT_RUN |
| 防冷場 pacing 實機節奏 | NOT_RUN |
| Dark visual redesign code | IMPLEMENTED / RUNTIME_UNVERIFIED |
| Vercel Demo | BLOCKED：Vercel team 尚無 lunch-roulette project，現有 connector 無 create/deploy action |

本機接手第一輪：

```bash
git status
git switch soda
pnpm install --frozen-lockfile
pnpm test:unit
pnpm typecheck
pnpm build
pnpm test:e2e
```

### Local execution blocker

2026-09-29 本次實際查核：

- Container：Node `v22.16.0`、npm `10.9.2`。
- Container 無法 DNS 解析 `github.com` / Supabase。
- npm offline cache 缺少 `@playwright/test`；`npm install --package-lock-only --offline` 回傳 `ENOTCACHED`。
- 因此本環境無法誠實產生 lockfile、install dependencies 或跑 Vitest / vue-tsc / Vite build / Playwright。
- 這是執行環境 blocker，不應把 test code 存在誤寫成 runtime PASS。

### Runtime smoke test 必看

- [ ] 同房所有 client 都拿到相同 12 題。
- [ ] v0.1 舊房仍是 8 題。
- [ ] 第 4 / 8 / 11 題 pacing 不影響作答。
- [ ] Participant waiting copy 正常。
- [ ] Host lobby copy 正常。
- [ ] Host lock 後所有 participant 立即離開 quiz。
- [ ] 成功率出現時 session 還是 `locked`。
- [ ] 成功率三拍節奏不過快／不過慢。
- [ ] 公開處刑前手機看不到 Persona。
- [ ] 公開處刑後所有完成者同步 Persona。
- [ ] Incomplete participant 顯示「你沒有答完」。
- [ ] Refresh 後 Persona 不變。
- [ ] Host 公開畫面沒有 per-person answers。
- [ ] 9 人場次可正常運作。

---

## 10. Supabase

Project：

`hvaxoopyccwsqmhjnibg`

目前 client 使用：

`supabase.auth.signInAnonymously()`

UNKNOWN：

**Anonymous Sign-ins provider 是否 Enable 尚未 runtime 驗證。**

不要在未驗證前宣稱已開啟。

目前這輪視覺／pacing 改動：

- 沒有新增 DB schema。
- 沒有改 RLS。
- 沒有新增 migration。

---

## 11. Vercel

目前沒有已驗證的 `lunch-roulette` Vercel Demo。

Root `vercel.json` intent：

- 只有 `main` deployment enabled。
- feature / PR branch 不部署。

需要的一次性設定仍待完成：

- Import `sodahsu/lunch-roulette`
- Vite
- Build：`pnpm build`
- Output：`dist`
- Production branch：`main`
- Env：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

不可把 service-role secret 放到 frontend。

---

## 12. Branch / Repo

Repository：

`sodahsu/lunch-roulette`

Integration branch：

`main`

使用者要求：

> 最終保留單一 main。

舊 remote branch 清理之前曾因工具限制未完成。

所以：

- 不要假設舊 branch 已刪掉。
- 若要清 branch，先重新列出 remote branches。
- 不要直接依舊交接紀錄盲刪。

---

## 13. Next Action

### Priority 1｜Runtime correctness

- [ ] install
- [ ] unit
- [ ] typecheck
- [ ] build
- [ ] E2E
- [ ] Anonymous Auth
- [ ] 2～3 browser smoke test

### Priority 2｜Visual runtime QA / optional asset polish

Dark visual redesign code 已實作。下一步不是重做視覺，而是驗證：

```text
1. 375px mobile
2. 768px tablet
3. 1280px+ Host / projector
4. Persona SVG clarity
5. Q4 / Q8 / Q11 interstitial timing
6. Success Reveal timing
7. focus-visible
8. reduced-motion
```

若未來要把 inline SVG 換成 soft-3D 生成插畫，再使用本交接的 Visual Prompt Library；這是 optional asset polish，不阻塞目前功能。

視覺改版時不要更改：

- domain scoring。
- session state。
- Reveal ordering。
- DB schema。
- RLS。
- questionnaire selection。

除非另有產品需求。

### Priority 3｜Deploy

- [ ] Vercel project。
- [ ] production env。
- [ ] real-phone smoke test。
- [ ] QR code join。
- [ ] 投影／大螢幕 readability。

---

## 14. Resolved Architecture Decision

### Success-rate cross-version stability

已採用：

**`questionnaire_version → dinner-success algorithm version` 固定 mapping**

目前：

- `v0.1 → v1`
- `v0.2 → v1`
- 新 questionnaire version 若沒有 mapping，domain function 直接報錯。
- 不新增 success-summary DB 欄位。
- `group_stats` 繼續作為 persisted aggregate source。
- 舊 room 不會因未來新增 success formula 而 silent fallback 到新公式。

此技術決策已完成；OpenSpec archive 現在只被 runtime / integration validation 阻擋。

**OpenSpec archive = NOT_READY（最新 HEAD runtime / integration validation + archive readiness）**

---

## 15. 交付狀態

### FACT

- 核心遊戲程式已寫。
- v0.2 question bank 已寫。
- 兩段式 Reveal 已寫。
- 防冷場 pacing 已寫。
- Test code 已寫。
- OpenSpec 已同步目前 gameplay。
- 本交接已補上下一輪 dark editorial 視覺需求。

### NOT_RUN / UNKNOWN

- 2026-09-30 較早 HEAD 曾完成 unit / typecheck / build / 16 項 E2E；最新 HEAD 已加入 Host overview、CASE-17 / 18 與規格收斂，2026-10-01 本環境因 GitHub DNS 無法重新 clone / install，因此最新 HEAD 尚未完整重跑。
- Anonymous Auth enable 狀態仍未知；Supabase project 已 VERIFIED ACTIVE_HEALTHY；2026-10-01 已確認 Host-only revealed participant overview RLS policy 存在。Security Advisor 目前有 Anonymous Sign-ins 與 leaked-password-protection warnings，不應再寫成 0 lint。
- 真機多人同步未驗證。
- Dark visual redesign 已實作，但尚未完成 browser / device runtime QA。
- Vercel production demo 尚未建立；2026-09-29 查核 Vercel team 目前只有 `beloved-agent`，沒有 `lunch-roulette` project，且目前 Vercel connector 沒有可用的 create-project / deploy action。
- remote branches 已重新驗證，仍有 `chore/vercel-main-only`、`feat/lunch-roulette-mvp`、`feat/reveal-sync-show`、`spec/openspec-lunch-roulette-mvp` 與 `main`；目前連接器沒有 delete-branch action。

## Verdict

**READY_FOR_HANDOFF**

這代表下一個 Agent 可以安全接手，不代表程式已通過 runtime 驗收。
