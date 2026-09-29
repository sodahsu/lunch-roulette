# Capability: result-reveal

## Requirement: Reveal 只使用完整 response
The system SHALL calculate reveal results using only complete responses captured after the session is locked.

### Scenario: 混合完整與未完整 responses
- WHEN locked session 同時存在 complete 與 incomplete responses
- THEN group stats 只計入 complete responses
- AND persona / pairing 只為 complete participants 建立
- AND incomplete participants 不得影響有效樣本數

### Scenario: 未完成 participant 在 Reveal 後查看結果
- WHEN participant 在鎖定前沒有完成 active questionnaire
- AND session 已進入 `revealed`
- THEN系統不得硬判該 participant 的 persona
- AND 應顯示明確的「未完成」結果狀態

## Requirement: Group stats 必須保存 Reveal 當下的 aggregate
The system SHALL persist group statistics for the revealed session.

### Scenario: 建立 group snapshot
- WHEN host 完成 Reveal 計算
- THEN系統應把 selected questions 的 aggregate counts 與有效樣本數保存於 group snapshot
- AND participant 重新整理後應讀取既有 group snapshot

## Requirement: 公開結果不得揭露個人逐題答案
The system SHALL present public reveal information only as aggregates.

### Scenario: 主持人大螢幕顯示結果
- WHEN session status 為 `revealed`
- THEN主持人畫面可顯示有效樣本、aggregate counts、最一致題目與最分裂題目
- AND不得顯示「某位 participant 在某一題選了哪個 option」

## Requirement: Reveal 必須回答「我們這團可以出去吃飯嗎？」
The system SHALL derive a deterministic group dining compatibility result from the persisted group statistics.

### Scenario: 計算飯局相容度
- WHEN 至少兩位 complete participants 形成可用 group stats
- THEN每一題的共識度應為該題最高 option count 除以 sample size
- AND整體相容度應為所有可用題目共識度的平均值
- AND顯示分數應四捨五入為 0–100 的整數

### Scenario: 80–100 分
- WHEN 飯局相容度大於等於 80
- THEN verdict 應為「我們這團可以直接出去吃飯」

### Scenario: 68–79 分
- WHEN 飯局相容度介於 68 與 79
- THEN verdict 應為「我們這團可以出去吃飯」

### Scenario: 56–67 分
- WHEN 飯局相容度介於 56 與 67
- THEN verdict 應為「可以出去吃，但不要開放全民表決」

### Scenario: 0–55 分
- WHEN 飯局相容度低於 56
- THEN verdict 應為「可以出去吃，但最好先指定隊長」

### Scenario: 可用樣本不足
- WHEN complete participant 少於兩位
- THEN系統應顯示樣本不足狀態
- AND不得把 0 分解讀為已確認的低相容度

### Scenario: Host 顯示團體 verdict
- WHEN session status 為 `revealed`
- THEN主持人大螢幕應優先顯示「我們這團可以出去吃飯嗎？」
- AND顯示飯局相容度百分比
- AND可再顯示都可以自信值、飲食內戰與歷史性共識

### Scenario: Participant 顯示團體 verdict
- WHEN complete participant 已進入自己的 persona result
- THEN手機結果應同步顯示同一場次的團體 verdict
- AND顯示相同飯局相容度百分比

## Requirement: Persona 使用 deterministic scoring
The system SHALL assign one of the configured eight personas using only the participant's active-question answers and the configured v0.2 scoring rules.

### Scenario: Persona scoring
- WHEN participant 為 complete
- THEN系統應加總其 active answers 對各 persona 的 option scores
- AND選擇總分最高的 persona
- AND不得使用 threshold 作為 v0.2 persona 判定

### Scenario: Persona score 平手
- WHEN兩個以上 personas 具有相同最高分
- THEN系統應依固定 `PERSONA_PRIORITY` 選出結果
- AND相同 answers 與相同 rules 必須得到相同 persona

### Scenario: Persist personal result
- WHEN host 建立 Reveal results
- THEN complete participant 的 persona 與 pairing result 應保存成 participant-specific persisted result
- AND participant 重新整理後應載入同一 persisted result

## Requirement: Pairing 只比較 complete participants
The system SHALL calculate participant similarity only among complete responses from the same active questionnaire.

### Scenario: 計算 similarity
- WHEN比較兩位 complete participants
- THEN similarity 應為雙方 active questions 中答案完全相同的題數除以可比較題數

### Scenario: 靈魂飯友
- WHEN至少存在另一位 complete participant
- THEN系統應列出 similarity 最高的 participant
- AND不得把自己列入 pairing

### Scenario: 飲食天敵
- WHEN至少存在另一位 complete participant
- THEN系統應列出 similarity 最低的 participant

### Scenario: similarity 並列
- WHEN多人具有相同最高或最低 similarity
- THEN系統應保留所有並列 participants
- AND不得任意挑選單一對象

### Scenario: 只有一位 complete participant
- WHEN只有一位 complete participant
- THEN系統不得產生靈魂飯友或飲食天敵

## Requirement: Persona card 只能在全場 Reveal 後出現
The system SHALL not display a participant persona before session status is `revealed`.

### Scenario: locked 階段
- WHEN session status 為 `locked`
- THENparticipant 手機應顯示結算等待狀態
- AND不得顯示 persona card

### Scenario: revealed 階段
- WHEN session status 從 `locked` 變成 `revealed`
- THENparticipant 手機應透過 Realtime 載入自己的 persisted result
- AND自動切換到 persona result
