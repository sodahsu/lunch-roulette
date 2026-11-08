# Capability: food-consensus

## ADDED Requirements

### Requirement: Open 階段可顯示 provisional food consensus
The system SHALL derive non-persisted food consensus from current complete participants that have answered `food-avoid`.

#### Scenario: 只有一位有效 participant
- WHEN session status 為 `open`
- AND 只有一位 complete participant 有回答 `food-avoid`
- THEN UI 可以顯示該 participant 目前可接受的餐點
- AND 不得把單人結果標示為「大家都能吃」

#### Scenario: 兩位以上有效 participants
- WHEN session status 為 `open`
- AND 至少兩位 complete participants 有回答 `food-avoid`
- THEN 系統應顯示目前所有有效 participants 都未排除的餐點類別
- AND 應標示為 provisional / 尚未鎖定
- AND 不得把結果 persist 成正式 group snapshot

#### Scenario: Food avoidance 更新
- WHEN open session 中有效 participant 修改 `food-avoid`
- THEN provisional food consensus 應以 latest values 重新推導

#### Scenario: 未回答者
- WHEN participant 未回答 `food-avoid`
- THEN該 participant 不得被視為「什麼都能吃」
- AND不得進入 provisional food consensus sample
