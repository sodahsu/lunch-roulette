# food-consensus Specification

## Purpose
讓全場以排除制回報不吃的餐點類別，揭曉時彙總出「大家都能吃」的清單，且不洩漏任何人的個別選擇。

## Requirements

### Requirement: 以排除制收集忌口
The system SHALL ask each participant, after the last scored question, which food categories they will not or cannot eat, and treat every unselected category as acceptable.

#### Scenario: 交卷前的忌口步驟
- WHEN participant 答完最後一題並按「交卷」
- THEN 系統應先顯示忌口步驟，而不是直接進入 waiting
- AND participant 可複選 0 到多個類別
- AND 未勾選任何類別時，答案應以 `none` 儲存，與「尚未回答」區分

#### Scenario: 忌口不影響人格與成功率
- WHEN participant 提交忌口
- THEN 答案以固定 key `food-avoid` 存入 `responses.answers`
- AND 不得進入題庫、persona 計分、相似度或 dinner success 計算

#### Scenario: 重新整理後續填
- WHEN participant 已完成計分題但沒有 `food-avoid` 答案，且 session 仍為 `open`
- THEN 重新整理後應回到忌口步驟

### Requirement: 揭曉時彙總忌口且不洩漏個人選擇
The system SHALL aggregate food avoidance into a single `food-avoid` group stat at reveal time, storing only per-category counts.

#### Scenario: 彙總
- WHEN session 被 reveal
- THEN 系統只納入 complete 且有回答 `food-avoid` 的 participants
- AND `sampleSize` 為有回答的人數，counts 為各類別被排除的人數
- AND 不得記錄是誰排除了哪個類別

#### Scenario: 沒人回答（舊場次）
- WHEN 沒有任何 complete participant 回答 `food-avoid`
- THEN 不產生 `food-avoid` stat
- AND 結果頁不得顯示共識餐點區塊

#### Scenario: 不干擾題目統計
- WHEN 結果頁挑選「飲食內戰」與「歷史性共識」
- THEN 必須排除 `food-avoid` stat

### Requirement: 結果頁列出全員可接受的餐點
The system SHALL list, on both the host result view and each participant result view, the food categories that no participant ruled out.

#### Scenario: 有共識類別
- WHEN 至少一個類別的排除人數為 0
- THEN 顯示所有排除人數為 0 的類別

#### Scenario: 沒有共識類別
- WHEN 每個類別都至少被一人排除
- THEN 顯示「沒有全員都能接受的類別」
- AND 不得把「排除人數最少」的類別包裝成全員共識或推薦答案
- AND 結果頁應明確提示本場沒有安全牌

#### Scenario: 未回答者
- WHEN 部分 participant 沒有回答忌口
- THEN 他們不得被視為「什麼都能吃」，也不計入 sampleSize
