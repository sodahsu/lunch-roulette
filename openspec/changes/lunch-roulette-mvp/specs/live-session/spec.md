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


## Requirement: 結算期間所有參與者同步等待
The system SHALL use the shared session status as the single source of truth for reveal timing.

### Scenario: 主持人開始結算
- WHEN 主持人觸發 Reveal
- THEN 系統先將 session status 從 `open` 切換為 `locked`
- AND 所有參與者裝置透過 Realtime 進入等待揭曉畫面
- AND 任何參與者不得在 `locked` 階段提前看到 persona

### Scenario: Reveal 完成
- WHEN result snapshot 與 participant results 已建立
- AND session status 切換為 `revealed`
- THEN 所有在線參與者裝置應自動切換到各自的人格卡
- AND 不需要參與者手動重新整理或按下一步
