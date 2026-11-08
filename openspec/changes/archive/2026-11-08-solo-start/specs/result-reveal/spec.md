# Capability: result-reveal

## ADDED Requirements

### Requirement: Open 階段可顯示私有 provisional persona
The system SHALL allow a complete participant to view a deterministic provisional persona while the session remains open, without persisting a formal participant result.

#### Scenario: 單人完成答題
- WHEN session status 為 `open`
- AND participant 已完成 active questionnaire
- THEN 系統應使用既有 persona scoring rules 建立該 participant 的 provisional persona
- AND provisional persona 只能顯示給該 participant
- AND 不得寫入正式 `participant_results`

#### Scenario: Open 階段修改答案
- WHEN participant 在 `open` 狀態修改答案
- THEN 舊 provisional persona 應視為失效
- AND 系統應以 latest complete answers 重新計算
- AND 正式 persisted result 仍不得被建立

### Requirement: 單一 complete participant 不得顯示團體成功率
The system SHALL not present the dinner success percentage when fewer than two complete participants are available.

#### Scenario: 只有一位 complete participant
- WHEN session status 為 `open`
- AND complete participant count = 1
- THEN UI 應顯示單人狀態
- AND 不得顯示 group dinner success percentage
- AND 不得將缺少群體樣本解讀為 0%
- AND 不得產生 soulmate 或 opposite

### Requirement: Open 階段可顯示 provisional group preview
The system SHALL derive a non-persisted group preview from current complete responses when at least two complete participants exist.

#### Scenario: 兩位以上 complete participants
- WHEN session status 為 `open`
- AND complete participant count >= 2
- THEN 系統應使用該 questionnaire version 對應的既有 dinner-success algorithm 計算 provisional success rate
- AND 應清楚標示結果尚未鎖定
- AND 不得寫入正式 `result_snapshots`

#### Scenario: 有效樣本改變
- WHEN open session 中 participant 完成、變成 incomplete、重新完成或修改 answers
- THEN provisional group preview 應依 latest complete responses 重新推導

### Requirement: 正式 Reveal 必須重新從 locked source of truth 建立結果
The system SHALL rebuild formal results from locked responses instead of persisting a previously computed provisional object.

#### Scenario: Host 從 provisional state 開始正式 Reveal
- WHEN host 將 session 由 `open` 切換為 `locked`
- THEN open provisional result 應停止更新
- AND正式 Stage A 應由 locked complete responses 重新計算 dinner success
- AND正式 Stage B 才能 persist `result_snapshots` 與 `participant_results`

#### Scenario: Final persona 取代 provisional persona
- WHEN session 由 `locked` 切換為 `revealed`
- THEN complete participant 應顯示 persisted formal result
- AND provisional persona 不再作為結果來源
