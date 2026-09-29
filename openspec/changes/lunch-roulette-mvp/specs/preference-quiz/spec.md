# Capability: preference-quiz

## Requirement: 參與者可在揭曉前修改答案
The system SHALL allow a participant to update their answers repeatedly while the session status is `open`.

### Scenario: 修改已填答案
- WHEN 參與者已儲存一份答案
- AND 場次狀態仍為 `open`
- AND 參與者修改其中一題
- THEN 系統應保存新的 latest response
- AND 先前版本不得被當作鎖定時的有效答案

## Requirement: 完整性由題組定義判定
The system SHALL determine whether a response is complete using the active questionnaire definition.

### Scenario: 所有必填題完成
- WHEN 參與者完成 active questionnaire 的所有必填題
- THEN 該 response 應標記為 complete

### Scenario: 缺少必填題
- WHEN 參與者仍缺少至少一題必填題
- THEN 該 response 應標記為 incomplete
- AND 該 response 不得進入 Reveal 的統計樣本

## Requirement: 題目內容屬於可版本化設定
The system SHALL associate each session with a questionnaire version.

### Scenario: 場次使用固定題組版本
- WHEN 場次建立完成
- THEN 該場次應保存 questionnaire version
- AND 同一場次的完成判定應使用同一版本

## v0.1 決策
- 第一版固定使用 `src/domain/questions.ts` 中的 8 題。
- 8 題皆為 required。
- session 仍保存 questionnaire version，未來換題時必須升版，不可讓同一場次中途換題。
