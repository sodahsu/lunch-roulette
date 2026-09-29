# Capability: live-session

## Requirement: 參與者可以加入開放中的場次
The system SHALL allow a participant to join a session while the session status is `open`.

### Scenario: 正常加入
- WHEN 場次狀態為 `open`
- AND 參與者提供顯示名稱
- THEN 系統建立該參與者的場次身分
- AND 參與者可以進入答題流程

### Scenario: 超過預期人數仍可加入
- WHEN 場次已有約 8 位參與者
- AND 場次狀態仍為 `open`
- THEN 新參與者仍可加入
- AND 系統不得因「已達 8 人」拒絕加入

## Requirement: 主持人可以手動鎖定場次
The system SHALL allow the host to lock an open session without requiring a fixed participant count or full completion.

### Scenario: 未滿預期人數仍可鎖定
- WHEN 場次狀態為 `open`
- AND 已有部分參與者完成答題
- THEN 主持人可以鎖定場次
- AND 系統不得要求必須湊滿 8 人

### Scenario: 有人未完成仍可鎖定
- WHEN 場次狀態為 `open`
- AND 至少一位參與者尚未完成答題
- THEN 主持人仍可鎖定場次
- AND 未完成者不得阻塞揭曉流程

## Requirement: 鎖定後答案不可再變更
The system SHALL reject answer changes after the session leaves the `open` state.

### Scenario: 鎖定後嘗試修改
- WHEN 場次狀態為 `locked` 或 `revealed`
- AND 參與者嘗試更新答案
- THEN 系統不得接受新的答案版本
- AND 使用者介面應顯示場次已鎖定

## Requirement: 揭曉結果必須固定
The system SHALL persist a result snapshot before the session becomes `revealed`.

### Scenario: Reveal 後重新載入
- WHEN 場次已為 `revealed`
- AND 參與者重新整理頁面
- THEN 系統應載入既有 result snapshot
- AND 不得因重新計算而產生不同結果
