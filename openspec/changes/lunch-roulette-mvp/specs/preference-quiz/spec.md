# Capability: preference-quiz

## Requirement: 題組由 questionnaire version 決定
The system SHALL determine the active questionnaire from the session questionnaire version.

### Scenario: v0.2 新場次
- WHEN session questionnaire version 為 `v0.2`
- THEN active question bank 應包含 24 題
- AND 題庫應分成 6 類
- AND 每類包含 4 題

### Scenario: v0.1 舊場次
- WHEN session questionnaire version 為 `v0.1`
- THEN active questionnaire 應維持原本 8 題
- AND 不得因部署 v0.2 而把既有 v0.1 場次改成 12 題

## Requirement: v0.2 每個房間固定取得 12 題
The system SHALL deterministically derive the v0.2 active questionnaire from the session code.

### Scenario: 建立 v0.2 題組
- WHEN 系統取得 v0.2 session code
- THEN 應從 6 個 question categories 各選 2 題
- AND 共得到 12 題
- AND `self-image` 必須包含在該 12 題中

### Scenario: 同一場次由不同 participants 開啟
- WHEN 多位 participants 使用同一 session code
- THEN 所有人應取得相同 12 題
- AND 題目順序應一致

### Scenario: 重新整理
- WHEN participant 在同一 v0.2 session 重新載入
- THEN active 12 題與順序不得改變

## Requirement: 完整性只以 active questionnaire 判定
The system SHALL determine response completeness using only the active questions for that session.

### Scenario: 完成全部 active required questions
- WHEN participant 已回答 active questionnaire 的所有 required questions
- THEN response 應標記為 complete

### Scenario: 缺少 active required question
- WHEN participant 尚缺至少一題 active required question
- THEN response 應標記為 incomplete
- AND 該 response 不得進入 Reveal 統計、persona 或 pairing

### Scenario: v0.2 未回答未被抽中的題目
- WHEN participant 已完成該場次的 12 題
- AND 24 題題庫中的其他 12 題沒有答案
- THEN response 仍應視為 complete

## Requirement: Reveal 前可反覆修改答案
The system SHALL allow a participant to update their answers repeatedly while the session status is `open`.

### Scenario: 修改已填答案
- WHEN participant 已儲存一份答案
- AND session status 仍為 `open`
- AND participant 修改其中一題
- THEN 系統應更新該 participant 的 latest response
- AND Reveal 不得使用被覆蓋的舊答案版本

## Requirement: 同一 participant 重新進入時恢復 latest answers
The system SHALL restore the participant's latest persisted answers while the session remains available.

### Scenario: 未完成者重新整理
- WHEN participant 已回答部分 active questions
- AND participant 重新載入同一 open session
- THEN 系統應載入 latest answers
- AND 將 participant 帶回尚未完成的 active question

### Scenario: 已完成者重新整理
- WHEN participant 已完成 active questionnaire
- AND session status 仍為 `open`
- THEN 系統應載入 latest answers
- AND 顯示等待主持人 Reveal 的狀態
- AND participant 仍可選擇回去修改答案


## Requirement: 12 題流程必須避免連續問卷感
The system SHALL insert lightweight pacing cues into the v0.2 questionnaire without changing answers or scoring.

### Scenario: 第 4 題
- WHEN participant 進入第 4 題
- THEN UI 應顯示「場面觀察」節奏事件
- AND 不得公開任何 participant 的真實答案或身份

### Scenario: 第 8 題
- WHEN participant 進入第 8 題
- THEN UI 應顯示中場節奏事件
- AND 該事件只作為遊戲氣氛，不影響 scoring

### Scenario: 第 11 題
- WHEN participant 進入第 11 題
- THEN UI 應提示最後兩題
- AND 不得改變 active questionnaire 或答案內容
