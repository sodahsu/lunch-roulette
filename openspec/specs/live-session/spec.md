# live-session Specification

## Purpose
定義主持人建立場次、參與者加入、鎖定與兩段式 Reveal 的現場流程，以及等待階段的節奏提示與音效控制。

## Requirements

### Requirement: 主持人可以建立可分享的開放場次
The system SHALL allow a host to create a new session in the `open` state.

#### Scenario: 建立新場次
- WHEN 主持人建立新局
- THEN 系統應建立唯一房號
- AND 新場次應使用 questionnaire version `v0.2`
- AND 主持人畫面應顯示房號
- AND 主持人畫面應提供對應該房號的加入 QR Code

### Requirement: 參與者只能加入開放中的場次
The system SHALL allow a participant to join a session only while the session status is `open`.

#### Scenario: 使用房號或 QR Code 加入
- WHEN 場次狀態為 `open`
- AND 參與者提供有效房號與顯示名稱
- THEN 系統建立或恢復該使用者在此場次的 participant identity
- AND 參與者可以進入答題流程

#### Scenario: 超過主要預期人數
- WHEN 場次已有約 8 位參與者
- AND 場次狀態仍為 `open`
- THEN 第 9 位及之後的參與者仍可加入

#### Scenario: 場次已鎖定或揭曉
- WHEN session status 為 `locked` 或 `revealed`
- AND 新使用者嘗試加入
- THEN 系統不得建立新的 participant

### Requirement: 等待階段應提供不洩漏答案的現場節奏提示
The system SHALL use participant/completion counts to keep the lobby and waiting screens active without exposing personal answers.

#### Scenario: Host 等待玩家加入或交卷
- WHEN session status 為 `open`
- THEN host 可依已加入人數與完成人數顯示趣味狀態文案
- AND 文案不得指認某位 participant 選了什麼答案

#### Scenario: Participant 已交卷
- WHEN participant 已完成 active questionnaire
- AND session status 仍為 `open`
- THEN participant waiting 畫面應顯示目前完成人數
- AND 可依尚未完成人數顯示趣味等待文案
- AND participant 仍可回去修改自己的答案

### Requirement: 主持人可看到場次進度但看不到個人答案
The system SHALL expose participant presence and completion progress to the host without exposing per-person answer choices.

#### Scenario: 顯示主持人進度
- WHEN participants 加入或完成答題
- THEN 主持人畫面應更新已加入人數
- AND 更新已完成人數
- AND 可顯示 participant display names
- BUT SHALL NOT 顯示某位 participant 的逐題答案

### Requirement: 主持人可在至少一位完成者存在時開始 Reveal
The system SHALL allow the host to start Reveal without requiring a fixed participant count or full completion.

#### Scenario: 未滿 8 人或有人未完成
- WHEN session status 為 `open`
- AND 至少一位 participant 已完成答題
- THEN 主持人可以開始 Reveal
- AND 未完成者不得阻塞揭曉

#### Scenario: 沒有任何完成者
- WHEN completed participant count 為 0
- THEN 主持人介面不得提供可執行的 Reveal 動作

### Requirement: 鎖定後答案不可再變更
The system SHALL reject answer changes after the session leaves the `open` state.

#### Scenario: 鎖定後嘗試修改
- WHEN session status 為 `locked` 或 `revealed`
- AND participant 嘗試更新答案
- THEN 系統不得接受新的答案版本
- AND UI 不得繼續提供正常答題操作

### Requirement: Reveal 分為團體成功率與個人人格兩個階段
The system SHALL keep participants waiting through the group-success reveal and only expose persona cards after an explicit host action.

#### Scenario: 主持人開始 Reveal
- WHEN 主持人觸發「鎖定並揭曉」
- THEN session status 應由 `open` 切換為 `locked`
- AND 所有在線 participants 應透過 Realtime 進入等待畫面
- AND participant 在整個 `locked` 階段不得看到 persona card

#### Scenario: 大螢幕先公布成功率
- WHEN session 已為 `locked`
- AND Reveal 倒數完成
- THEN host 應使用 locked responses 計算 aggregate
- AND host 應顯示「我們這團今晚約成飯的成功率」
- AND session status 此時仍必須保持 `locked`
- AND participant 手機仍停留在等待畫面

#### Scenario: 主持人觸發全場翻牌
- WHEN host 已看到今晚約成飯的成功率
- AND host 觸發「翻出所有人格卡」
- THEN 系統才建立／保存 group snapshot 與 participant results
- AND session status 應由 `locked` 切換為 `revealed`

#### Scenario: Participant 同步翻人格
- WHEN session status 從 `locked` 變成 `revealed`
- THEN complete participants 應透過 Realtime 自動載入自己的 persisted result
- AND 手機自動切換為 persona card
- AND participant 不需要手動重新整理或按下一步

#### Scenario: 主持人在 locked 階段重新整理
- WHEN host 在 session status = `locked` 時重新載入
- THEN session 仍維持 locked
- AND participant 手機不得提前翻牌
- AND host 可以重新計算同一份 locked responses 的成功率並繼續 Reveal
- AND 不需要重新開一局

### Requirement: 使用者可控制音效且靜音偏好會保留
The system SHALL provide a global audio control for presentation cues without changing session state, answers, scoring or reveal results.

#### Scenario: 切換靜音
- WHEN 使用者關閉音效
- THEN 持續中的 lobby loop 應停止
- AND 後續短音效與 Reveal cue 不應播放

#### Scenario: 重新載入
- WHEN 使用者已設定靜音
- AND 重新載入頁面
- THEN 系統應恢復該瀏覽器的靜音設定

#### Scenario: Mobile autoplay 限制
- WHEN 瀏覽器要求使用者互動後才能建立或 resume AudioContext
- THEN 系統應等待合法的使用者 gesture 解鎖音訊
- AND 音訊失敗不得阻塞答題、鎖定或 Reveal 主流程
