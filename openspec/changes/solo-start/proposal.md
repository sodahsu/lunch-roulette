# Change: solo-start

## Proposal

### Why

目前《都可以？》的核心流程從多人場次出發：Host 開房、等待其他人加入、大家完成答題，再進入 Reveal。第一位玩家在現場容易遇到「先開房、再等人」的空檔。

本變更把同一個 session 改成「1 個人就能先玩，朋友之後再加入」：

- 建立場次的人可以立刻成為第一位 participant，不必等第二個人。
- 第一位 participant 完成後先看到自己的「暫時人格」與目前飯局局勢。
- session 仍保持 `open`，房號與 QR Code 持續可分享。
- 後加入者不會讓既有玩家重來；每當有效樣本改變，open 階段的暫時局勢重新計算。
- Host 最後仍可執行既有 `open → locked → revealed` 正式 Reveal，正式結果只採鎖定當下的有效資料。

這不是另外建立一套 Solo 產品，而是讓同一局從 1 人自然成長為 N 人。

### Scope

- Host 建立新局後可選擇「我先玩」，以同一匿名登入身分在該場次建立第一個 participant identity。
- 1 位 participant 即可開始並完成既有 questionnaire 與 food-avoid。
- Host 同時是 participant 時，Host 控制權與 participant 作答身分必須保持可區分，不建立第二個 auth session。
- open 階段完成答題者可看到自己的「暫時人格卡」；暫時人格使用既有 deterministic persona scoring，但不得寫入正式 `participant_results`。
- 只有 1 位 complete participant 時，不產生靈魂飯友／飲食天敵，也不把既有團體成功率公式硬套成單人百分比。
- complete participant 達 2 位以上時，open 階段可顯示「目前飯局局勢」：
  - 暫時的今晚約成飯成功率。
  - 目前大家都能接受的餐點。
  - 加入人數、完成人數與娛樂性飯局難度提示。
- open 階段的成功率與食物共識都是 provisional preview：
  - 不 persist 成正式 result snapshot。
  - participant 加入、完成、修改答案或修改 food-avoid 後重新計算。
  - UI 必須清楚標示「目前局勢／尚未鎖定」，不得冒充正式 Reveal 結果。
- 新 participant 只能在 session = `open` 時加入，沿用既有 late-join boundary。
- 新 participant 加入後，既有 participant 的答案、完成狀態、participant identity 與作答進度不得被重置。
- open 階段已完成者仍可回去修改答案；修改後 provisional preview 必須跟著更新。
- 正式 Reveal 仍沿用既有兩段式：
  1. Host 鎖定，正式計算成功率。
  2. Host 觸發人格翻牌，persist group snapshot 與 participant results，切到 `revealed`。
- 正式結果仍以 locked 當下的 complete responses 為唯一依據；open preview 不具正式 ownership。
- QR Code / 房號在 `open` 階段持續有效。
- 保留目前 24 題題庫、每房 deterministic 12 題、10 Persona、food consensus、rare card 與 pairing 規則。

### UX direction

第一位玩家不再停在空白 lobby，而是：

```text
建立飯局
→ 我先玩
→ 回答本局 12 題 + 忌口
→ 翻出「暫時人格」
→ 看目前飯局局勢
→ 分享 QR / 房號
→ 朋友陸續加入
→ 局勢重新計算
→ Host 最後鎖定
→ 正式兩段 Reveal
```

Open 階段可以使用不影響 domain 的娛樂性提示，例如：

- 1 人：最大的敵人是自己。
- 2 人：友情開始接受考驗。
- 3–4 人：有人說「都可以」了。
- 5–6 人：民主制度開始失效。
- 7 人以上：大型飯局警報。

這些只屬 presentation copy，不得影響成功率、人格、配對或 food consensus。

### Out of scope

- 另外建立獨立的 Solo session type。
- 只有 1 位 participant 時自行發明新的「單人成功率百分比」公式。
- open preview 寫入正式 `result_snapshots` 或 `participant_results`。
- 讓 `locked` / `revealed` 場次重新開放 late join。
- 新的餐廳搜尋、推薦、地圖、訂位或 AI 核心判定。
- 因為新增 Solo-start 而改寫既有 questionnaire / persona scoring。
- 讓 provisional result 取代正式兩段 Reveal。

## Affected capabilities

1. `live-session`
   - Host 可直接成為第一位 participant。
   - open 階段持續可加入。
   - late join 不重置既有進度。
   - open provisional state 隨有效樣本更新。

2. `result-reveal`
   - 新增 open 階段 provisional persona / provisional group preview。
   - 正式 Reveal 與正式 persistence boundary 維持不變。

3. `food-consensus`
   - open 階段可暫時計算目前全員可接受餐點。
   - 正式 food consensus 仍在 Reveal snapshot 固定。

## Compatibility

- 既有 v0.1 / v0.2 session state 不增加新的 database status；仍使用 `open / locked / revealed`。
- 舊場次不因部署此變更自動建立 host participant。
- 已 `locked` / `revealed` 的場次行為不變。
- 正式 dinner-success algorithm version mapping 不變。
- 正式 persona / rare / pairing persistence contract 不變。

## NEEDS_CONFIRMATION

- 首頁主要 CTA 最終命名：
  - 「開一局」
  - 「我先玩」
  - 或其他文案。
- 只有 1 位 complete participant 時，是否要另外設計一個獨立、非團體成功率的 Solo 指標；在確認公式前，本 change 不新增百分比。
- open provisional success rate 是否對所有 participants 顯示精確百分比，或只顯示趨勢／變化值。規格先允許 exact preview，但 UI 實作前需確認揭曉張力是否仍符合現場玩法。

## Change status

此 change 目前為 **SPEC ONLY / NOT IMPLEMENTED**。

不得把本文件描述的 Solo-start 行為寫入 `openspec/specs/` 當作已驗證現行規格；只有完成實作與相關 unit / typecheck / build / E2E / runtime 驗證後，才能 archive 並合併進現行 capability specs。
