# 結果揭曉規格增量

## MODIFIED Requirements

### Requirement: 今晚約成飯的成功率必須 deterministic 且版本固定
The system SHALL derive a deterministic dinner success rate from locked aggregate answers using the algorithm assigned to the session questionnaire version.

#### Scenario: 舊場次重新開啟
- WHEN session questionnaire version 為 `v0.1`、`v0.2` 或 `v0.3`
- THEN 系統應使用已固定的 `v1` dinner-success algorithm
- AND 不得因未來加入新公式而改用不同演算法

#### Scenario: 新 questionnaire version 沒有演算法 mapping
- WHEN session 使用尚未配置 dinner-success algorithm 的 questionnaire version
- THEN domain 計算應明確失敗
- AND 不得自動 fallback 到最新演算法

#### Scenario: 計算成功率
- WHEN 至少兩位 complete participants 形成可用 group stats
- THEN 成功率只應使用 active questionnaire 的計分題 stats
- AND 應排除 `food-avoid` 等 auxiliary stats
- AND 每一題的共識度應為該題最高 option count 除以 sample size
- AND 整體成功率應為所有可用題目共識度的平均值
- AND 顯示分數應四捨五入為 0–100 的整數

#### Scenario: 80–100 分
- WHEN 成功率大於等於 80
- THEN verdict 應為「今晚直接出門，不要再討論」

#### Scenario: 68–79 分
- WHEN 成功率介於 68 與 79
- THEN verdict 應為「今晚約得成，找一個人負責訂位」

#### Scenario: 56–67 分
- WHEN 成功率介於 56 與 67
- THEN verdict 應為「約得成，但不要再開全民表決」

#### Scenario: 0–55 分
- WHEN 成功率低於 56
- THEN verdict 應為「有機會約成，先指定飯局隊長」

#### Scenario: 可用樣本不足
- WHEN complete participant 少於兩位
- THEN 系統應顯示樣本不足狀態
- AND 不得把 0 分解讀為已確認的低成功率

### Requirement: Persona 使用 deterministic scoring
The system SHALL assign one of the configured ten personas using only the participant's active-question answers and the scoring rules of the session questionnaire version.

#### Scenario: Persona scoring
- WHEN participant 為 complete
- THEN 系統應加總其 active answers 對各 persona 的 option scores
- AND 以各 persona 的得分除以該房 active questions 中該 persona 可得的最高分，得到達成率
- AND 選擇達成率最高的 persona
- AND 不得使用 threshold 作為 persona 判定

#### Scenario: Persona score 平手
- WHEN 兩個以上 personas 具有相同最高達成率
- THEN 系統應依固定 `PERSONA_PRIORITY` 選出結果
- AND 相同 answers 與相同 rules 必須得到相同 persona

#### Scenario: 舊版本場次的 persona
- WHEN session questionnaire version 為 `v0.1` 或 `v0.2`
- THEN persona 結果應與升級 v0.3 之前相同
