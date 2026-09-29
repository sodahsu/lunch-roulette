# Capability: result-reveal

## Requirement: Reveal 只使用完整 response
The system SHALL calculate reveal results using only complete responses captured after the session is locked.

### Scenario: 混合完整與未完整 responses
- WHEN locked session 同時存在 complete 與 incomplete responses
- THEN group stats 只計入 complete responses
- AND persona / pairing 只為 complete participants 建立
- AND incomplete participants 不得影響有效樣本數

### Scenario: 未完成 participant
- WHEN participant 在鎖定前沒有完成 active questionnaire
- AND session 最後進入 `revealed`
- THEN 系統不得硬判該 participant 的 persona
- AND 應顯示明確的未完成狀態

## Requirement: 今晚約成飯的成功率必須 deterministic
The system SHALL derive a deterministic dinner success rate from locked aggregate answers.

### Scenario: 計算成功率
- WHEN 至少兩位 complete participants 形成可用 group stats
- THEN 每一題的共識度應為該題最高 option count 除以 sample size
- AND 整體成功率應為所有可用題目共識度的平均值
- AND 顯示分數應四捨五入為 0–100 的整數

### Scenario: 80–100 分
- WHEN 成功率大於等於 80
- THEN verdict 應為「今晚直接出門，不要再討論」

### Scenario: 68–79 分
- WHEN 成功率介於 68 與 79
- THEN verdict 應為「今晚約得成，找一個人負責訂位」

### Scenario: 56–67 分
- WHEN 成功率介於 56 與 67
- THEN verdict 應為「約得成，但不要再開全民表決」

### Scenario: 0–55 分
- WHEN 成功率低於 56
- THEN verdict 應為「有機會約成，先指定飯局隊長」

### Scenario: 可用樣本不足
- WHEN complete participant 少於兩位
- THEN 系統應顯示樣本不足狀態
- AND 不得把 0 分解讀為已確認的低成功率

## Requirement: 成功率必須先於 persona card 公布
The system SHALL reveal the group dinner success rate before any participant persona card becomes visible.

### Scenario: Host 成功率畫面
- WHEN session status 為 `locked`
- AND host 已完成 Reveal 倒數
- THEN 主持人大螢幕應優先顯示「我們這團今晚約成飯的成功率」
- AND 顯示成功率百分比與 deterministic verdict
- AND participant 手機仍不得顯示 persona card

### Scenario: Host 還沒按翻牌
- WHEN host 正在查看成功率畫面
- THEN session status 應保持 `locked`
- AND participant 手機應持續顯示等待狀態

## Requirement: Persona card 只能在主持人翻牌後出現
The system SHALL not persist or display participant persona cards until the host explicitly triggers the persona reveal.

### Scenario: Host 觸發人格翻牌
- WHEN host 按下「翻出所有人格卡」
- THEN 系統應建立 group snapshot
- AND 為 complete participants 建立 persisted participant results
- AND session status 應切換為 `revealed`

### Scenario: Participant 自動翻牌
- WHEN session status 從 `locked` 變成 `revealed`
- THEN complete participant 手機應透過 Realtime 自動載入自己的 persisted result
- AND 自動切換為 persona card
- AND persona card 應顯示 persona、靈魂飯友與飲食天敵
- AND 不要求 participant 再按任何按鈕

## Requirement: Group stats 必須保存正式 Reveal 當下的 aggregate
The system SHALL persist group statistics when the host triggers the final persona reveal.

### Scenario: 建立 group snapshot
- WHEN host 觸發人格翻牌
- THEN 系統應把 selected questions 的 aggregate counts 與有效樣本數保存於 group snapshot
- AND participant / host 重新整理後應讀取既有 group snapshot

## Requirement: 公開結果不得揭露個人逐題答案
The system SHALL present public reveal information only as aggregates.

### Scenario: 主持人大螢幕
- WHEN host 顯示成功率或 revealed group result
- THEN 可顯示有效樣本、aggregate counts、最一致題目與最分裂題目
- AND 不得顯示某位 participant 的逐題答案

## Requirement: Persona 使用 deterministic scoring
The system SHALL assign one of the configured eight personas using only the participant's active-question answers and configured v0.2 scoring rules.

### Scenario: Persona scoring
- WHEN participant 為 complete
- THEN 系統應加總其 active answers 對各 persona 的 option scores
- AND 選擇總分最高的 persona
- AND 不得使用 threshold 作為 v0.2 persona 判定

### Scenario: Persona score 平手
- WHEN 兩個以上 personas 具有相同最高分
- THEN 系統應依固定 `PERSONA_PRIORITY` 選出結果
- AND 相同 answers 與相同 rules 必須得到相同 persona

## Requirement: Pairing 只比較 complete participants
The system SHALL calculate participant similarity only among complete responses from the same active questionnaire.

### Scenario: 計算 similarity
- WHEN 比較兩位 complete participants
- THEN similarity 應為雙方 active questions 中答案完全相同的題數除以可比較題數

### Scenario: 靈魂飯友與飲食天敵
- WHEN 至少存在另一位 complete participant
- THEN 系統應列出 similarity 最高者為靈魂飯友
- AND 列出 similarity 最低者為飲食天敵
- AND 不得把自己列入 pairing

### Scenario: similarity 並列
- WHEN 多人具有相同最高或最低 similarity
- THEN 系統應保留所有並列 participants

### Scenario: 只有一位 complete participant
- WHEN 只有一位 complete participant
- THEN 系統不得產生靈魂飯友或飲食天敵
