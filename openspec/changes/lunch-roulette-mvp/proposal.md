# Change: lunch-roulette-mvp

## Proposal

### Why

《都可以？》不是餐廳推薦器，而是一個多人飯局人格社交遊戲。

參與者用手機回答飲食情境題；主持人控制全場 Reveal。Reveal 的高潮分成兩段：

1. 大螢幕先公布「我們這團今晚約成飯的成功率」。
2. 主持人再觸發全場翻牌，每個人的手機才同步出現自己的飲食人格。

產品核心問題是：

> 這群人嘴上都說「都可以」，今晚到底有多大機會真的約成一頓飯？

### Scope

- 主持人建立可分享的即時場次。
- 參與者以房號或 QR Code 加入，只輸入暱稱。
- 約 8 人是主要現場規模，但不是 hard limit。
- 新建立的 v0.2 場次使用 24 題題庫，依房號固定選出 12 題。
- Reveal 前可反覆修改答案；鎖定時只採最後有效答案。
- 至少一位完成者後主持人可開始 Reveal；未完成者不阻塞。
- Reveal 使用 `open → locked → revealed`。
- `locked` 階段先完成倒數並在主持人大螢幕顯示今晚約成飯的成功率。
- 成功率公開時 participant 手機仍停留在等待畫面，不得顯示 persona。
- 主持人按「公開處刑 🎴」後，系統才建立／保存正式結果並切到 `revealed`。
- `revealed` 後所有在線 participant 手機透過 Realtime 自動翻到人格卡。
- 主持人大螢幕只顯示匿名 aggregate，不公開「某人某題選了什麼」。
- 大螢幕結果可顯示：
  - 今晚約成飯的成功率。
  - 都可以自信值。
  - 飲食內戰。
  - 歷史性共識。
- 完成答題者手機顯示：
  - 飲食人格。
  - 靈魂飯友。
  - 飲食天敵。
- 核心題組、人格、配對與成功率皆採 deterministic 規則。
- UI 採 Dark Editorial × Food Personality × Social Experiment；Host / Quiz / Reveal / Persona Card 共用同一套高對比視覺系統。
- Persona runtime asset 使用 8 種自有 inline SVG animal glyph，不依賴外部生成圖或 CDN。

### Out of scope

- 真實餐廳搜尋、Google Maps、外送平台或訂位服務。
- 帳號、好友、長期歷史紀錄。
- 付款、推播、社群平台整合。
- 由生成式 AI 自由決定人格、配對或成功率。
- v0.2 由生成式 AI 即時產生核心結果。
- 大型活動高併發架構與正式商用 SLA。
- 強制湊滿 8 人才可開始或揭曉。

## Capabilities

1. `live-session`：開房、加入、進度、鎖定、兩段式 Reveal 與 Realtime 同步。
2. `preference-quiz`：版本化題組、房間固定抽題、作答與修改。
3. `result-reveal`：成功率、群體統計、人格卡與配對結果。

## v0.2 decisions

- 題庫：24 題。
- 類別：6 類，每類 4 題。
- 每局：依房號 deterministic 選 12 題，每類 2 題。
- `self-image` 每局必出。
- 舊 v0.1 場次仍使用原本 8 題。
- Persona：8 種人格，option score 加總，最高分勝出，同分使用固定 `PERSONA_PRIORITY`。
- Persona 不使用 threshold。
- Similarity：雙方 active questions 的答案完全一致率。
- 今晚約成飯的成功率：由 locked responses 的 aggregate deterministic 計算。
- Dinner-success algorithm 依 `questionnaire_version` 固定 mapping；v0.1 / v0.2 目前都使用 `v1`。
- 未配置 algorithm mapping 的新 questionnaire version 不得 silent fallback。
- 成功率顯示不代表 session 已 `revealed`；手機 persona 必須等待主持人公開處刑。
- v0.2 不使用 AI 作為任何核心判定。

## Change status

目前 code 與 OpenSpec change 已包含上述 v0.2 行為，但 runtime validation 尚未完整執行。

此 change 保持 active；在 unit / typecheck / build / E2E、Anonymous Auth 與必要整合驗證完成前，不應 archive 成已驗證的現行規格。
