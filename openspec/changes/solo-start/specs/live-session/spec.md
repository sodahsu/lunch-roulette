# Capability: live-session

## ADDED Requirements

### Requirement: Host 可在新場次中直接成為第一位 participant
The system SHALL allow the authenticated host of an open session to create or restore their own participant identity without creating a second auth session.

#### Scenario: Host 選擇自己先玩
- WHEN session status 為 `open`
- AND authenticated host 在該 session 尚無 participant identity
- AND host 選擇開始自己的答題流程
- THEN 系統應在同一 session 建立一筆屬於該 auth user 的 participant identity
- AND host 應可直接進入既有 questionnaire
- AND host authorization 與 participant identity 應同時成立

#### Scenario: Host 已經是 participant
- WHEN authenticated host 在該 session 已存在 participant identity
- AND host 再次進入自己的答題流程
- THEN 系統應恢復既有 participant
- AND 不得建立重複 participant

### Requirement: Open 場次可從一位 participant 成長為多人
The system SHALL keep the room joinable while the session remains open, regardless of whether one or more participants have already completed the questionnaire.

#### Scenario: 第一位 participant 已完成
- WHEN session status 為 `open`
- AND 已有一位 complete participant
- AND 新使用者以有效房號或 QR Code 加入
- THEN 系統應建立或恢復新使用者自己的 participant identity
- AND 既有 participant 的 identity、answers、completion 與 questionnaire progress 不得被重置

#### Scenario: 新 participant 尚未完成
- WHEN 新 participant 已加入但 response 尚未 complete
- THEN 既有 complete participants 的有效 aggregate sample 不應因該 participant 的存在而改變

### Requirement: Open 階段的 provisional result 不得改變正式 session state
The system SHALL treat provisional feedback as derived UI state while keeping the session status open.

#### Scenario: Participant 完成後查看暫時結果
- WHEN session status 為 `open`
- AND participant 已完成 active questionnaire
- THEN participant 可以查看 provisional feedback
- AND session status 必須仍保持 `open`
- AND 房號與 QR Code 應繼續允許新 participant 加入

#### Scenario: Host 開始正式 Reveal
- WHEN host 從 open provisional state 觸發正式 Reveal
- THEN session 應沿用既有 `open → locked` transition
- AND 後續 Reveal 流程不得因 provisional state 而增加新的 database status
