# Capability: live-session

## Requirement: 主持人可以建立可分享的開放場次
The system SHALL allow a host to create a new session in the `open` state.

### Scenario: 建立新場次
- WHEN 主持人建立新局
- THEN 系統應建立唯一房號
- AND 新場次應使用 questionnaire version `v0.2`
- AND 主持人畫面應顯示房號
- AND 主持人畫面應提供對應該房號的加入 QR Code

## Requirement: 參與者只能加入開放中的場次
The system SHALL allow a participant to join a session only while the session status is `open`.

### Scenario: 使用房號加入
- WHEN 場次狀態為 `open`
- AND 參與者提供有效房號與顯示名稱
- THEN 系統建立或恢復該使用者在此場次的 participant identity
- AND 參與者可以進入答題流程

### Scenario: 使用 QR Code 加入
- WHEN 參與者掃描主持人顯示的 QR Code
- THEN 加入連結應帶入該場次房號
- AND 參與者仍只需要提供自己的顯示名稱即可加入

### Scenario: 超過主要預期人數
- WHEN 場次已有約 8 位參與者
- AND 場次狀態仍為 `open`
- THEN 第 9 位及之後的參與者仍可加入
- AND 系統不得因「已達 8 人」拒絕加入

### Scenario: 場次已鎖定或揭曉
- WHEN session status 為 `locked` 或 `revealed`
- AND 新使用者嘗試加入
- THEN 系統不得建立新的 participant
- AND 使用者應看到此局已進入揭曉階段的狀態

## Requirement: 主持人可看到場次進度但看不到個人答案
The system SHALL expose participant presence and completion progress to the host without exposing per-person answer choices.

### Scenario: 顯示主持人進度
- WHEN participants 加入或完成答題
- THEN 主持人畫面應更新已加入人數
- AND 更新已完成人數
- AND 可顯示 participant display names
- BUT SHALL NOT 顯示「某位 participant 在某一題選了哪個 option」

## Requirement: 主持人可在至少一位完成者存在時手動鎖定
The system SHALL allow the host to start Reveal without requiring a fixed participant count or full completion.

### Scenario: 未滿 8 人仍可鎖定
- WHEN session status 為 `open`
- AND 至少一位 participant 已完成答題
- THEN 主持人可以開始 Reveal
- AND 系統不得要求必須湊滿 8 人

### Scenario: 有人未完成仍可鎖定
- WHEN session status 為 `open`
- AND 至少一位 participant 已完成答題
- AND 仍有其他 participant 未完成
- THEN 主持人仍可開始 Reveal
- AND 未完成者不得阻塞揭曉流程

### Scenario: 沒有任何完成者
- WHEN completed participant count 為 0
- THEN 主持人介面不得提供可執行的 Reveal 動作

## Requirement: 鎖定後答案不可再變更
The system SHALL reject answer changes after the session leaves the `open` state.

### Scenario: 鎖定後嘗試修改
- WHEN session status 為 `locked` 或 `revealed`
- AND participant 嘗試更新答案
- THEN 系統不得接受新的答案版本
- AND 使用者介面不得繼續提供正常答題操作

## Requirement: Reveal 時序由 session status 統一控制
The system SHALL use `sessions.status` as the single source of truth for reveal timing.

### Scenario: 主持人開始 Reveal
- WHEN 主持人觸發 Reveal
- THEN session status 應先由 `open` 切換為 `locked`
- AND 所有在線 participants 應透過 Realtime 進入等待揭曉畫面
- AND participant 在 `locked` 階段不得看到 persona card

### Scenario: Reveal 完成
- WHEN group snapshot 與所有可建立的 participant results 已寫入
- THEN session status 應由 `locked` 切換為 `revealed`
- AND 所有在線 participants 應自動進入結果畫面
- AND participant 不需要手動重新整理或按下一步

### Scenario: 主持人在 locked 階段重新整理
- WHEN host 在 session status = `locked` 時重新載入
- THEN 系統應恢復主持人揭曉狀態
- AND 主持人可以繼續完成 Reveal
- AND 不需要重新開一局
