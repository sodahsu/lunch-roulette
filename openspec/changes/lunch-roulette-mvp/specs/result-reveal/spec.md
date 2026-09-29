# Capability: result-reveal

## Requirement: 群體統計只使用完整答案
The system SHALL calculate aggregate results using only complete responses captured at lock time.

### Scenario: 混合完整與未完整答案
- WHEN 鎖定時有完整與未完整 responses
- THEN group stats 只計入完整 responses
- AND 公開結果應反映實際有效樣本數

### Scenario: 沒有完整答案
- WHEN 鎖定時沒有任何 complete response
- THEN 系統應產生可顯示的空結果狀態
- AND 不得產生 NaN、Infinity 或錯誤百分比

## Requirement: 公開結果不得揭露個人逐題答案
The system SHALL present public group results only as aggregates.

### Scenario: 顯示群體結果
- WHEN 主持人或大螢幕顯示揭曉結果
- THEN 畫面可以顯示總人數、比例、最一致與最分裂題目
- AND 不得顯示特定參與者對特定題目的選擇

## Requirement: 人格結果必須穩定
The system SHALL derive each participant persona from deterministic scoring rules and persist the result in the snapshot.

### Scenario: 相同答案重複計算
- WHEN 使用相同 questionnaire version、相同 answers 與相同 persona rules
- THEN persona result 必須一致

### Scenario: Reveal 後重新整理
- WHEN 參與者重新載入已揭曉場次
- THEN 顯示的人格必須與 snapshot 相同

## Requirement: 配對只比較完整參與者
The system SHALL calculate participant similarity only among complete responses.

### Scenario: 找出靈魂飯友
- WHEN 至少有兩位 complete participants
- THEN 系統應找出該參與者的最高相似度對象
- AND 不得把自己列為配對對象

### Scenario: 找出飲食天敵
- WHEN 至少有兩位 complete participants
- THEN 系統應找出該參與者的最低相似度對象

### Scenario: 相似度並列
- WHEN 多位參與者具有相同最高或最低 similarity
- THEN 系統應保留所有並列對象
- AND 不得任意挑選單一對象

### Scenario: 只有一位完整參與者
- WHEN 只有一位 complete participant
- THEN 系統不得產生靈魂飯友或飲食天敵結果

## Open questions
- NEEDS_CONFIRMATION: persona 名稱、分數權重、threshold 與 tie-break priority。
- NEEDS_CONFIRMATION: similarity 的第一版計算方式；建議先採等權題目一致率，避免過度複雜。
