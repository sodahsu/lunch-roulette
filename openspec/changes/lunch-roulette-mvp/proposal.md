# Change: lunch-roulette-mvp

## Proposal

### Why

《都可以？》不是餐廳推薦器，而是一個多人飯局人格社交遊戲。

參與者用手機回答飲食情境題；主持人控制全場 Reveal。最後公開的是群體共識、飯局相容度與匿名笑點，每個人的手機則顯示自己的飲食人格、靈魂飯友與飲食天敵。

產品核心問題是：

> 這群人嘴上都說「都可以」，實際上到底能不能一起出去吃飯？

### Scope

- 主持人建立一個可分享的即時場次。
- 參與者以房號或 QR Code 進入場次，只需輸入暱稱，不要求註冊流程。
- 約 8 人是主要現場規模，但不是加入門檻或 hard limit。
- 新建立的 v0.2 場次使用 24 題題庫，依房號固定選出 12 題。
- 參與者在 Reveal 前可反覆修改答案，鎖定時只採最後有效答案。
- 至少有一位完成者後，主持人可以手動 Reveal；未完成者不得阻塞其他人。
- Reveal 使用 `open → locked → revealed` 狀態同步所有裝置。
- 主持人大螢幕只顯示匿名 aggregate，不公開「某人某題選了什麼」。
- Reveal 後顯示：
  - 「我們這團可以出去吃飯嗎？」與飯局相容度。
  - 都可以自信值。
  - 飲食內戰。
  - 歷史性共識。
- 完成答題者取得固定的個人人格結果。
- 完成答題者可看到靈魂飯友與飲食天敵。
- Reveal 完成後，參與者手機透過 Realtime 自動翻到結果，不需手動重新整理。
- 核心題組、人格、配對與團體分數皆採 deterministic 規則。

### Out of scope

- 真實餐廳搜尋、Google Maps、外送平台或訂位服務。
- 帳號、好友、長期歷史紀錄。
- 付款、推播、社群平台整合。
- 由生成式 AI 自由決定人格、配對或飯局相容度。
- v0.2 由生成式 AI 即時產生吐槽文案。
- 大型活動高併發架構與正式商用 SLA。
- 強制湊滿 8 人才可開始或揭曉。

## Capabilities

1. `live-session`：開房、加入、進度、鎖定、Reveal 與 Realtime 同步。
2. `preference-quiz`：版本化題組、房間固定抽題、作答與修改。
3. `result-reveal`：群體統計、飯局相容度、人格卡與配對結果。

## v0.2 decisions

- 題庫：24 題。
- 類別：6 類，每類 4 題。
- 每局：依房號 deterministic 選 12 題，每類 2 題。
- `self-image` 每局必出。
- 舊 v0.1 場次仍使用原本 8 題，不因升版改題。
- Persona：8 種人格，option score 加總，最高分勝出，同分使用固定 `PERSONA_PRIORITY`。
- Persona 不使用 threshold。
- Similarity：雙方 active questions 的答案完全一致率。
- 飯局相容度：由 Reveal 後的 aggregate group stats deterministic 計算。
- v0.2 不使用 AI 作為任何核心判定。

## Change status

目前 code 與 OpenSpec change 已包含上述 v0.2 行為，但 runtime validation 尚未完整執行。

此 change 保持 active；在 unit / typecheck / build / E2E、Anonymous Auth 與必要整合驗證完成前，不應 archive 成已驗證的現行規格。
