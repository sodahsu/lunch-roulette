# 結果揭曉規格增量

## MODIFIED Requirements

### Requirement: Pairing 只比較 complete participants
系統 SHALL 只比較同一份問卷的完整作答者，且同一人不得同時出現在同一份結果的飯友與天敵清單。

#### Scenario: 計算 similarity
- WHEN 比較兩位 complete participants
- THEN similarity 應為雙方 active questions 中答案完全相同的題數除以可比較題數

#### Scenario: 靈魂飯友與飲食天敵
- WHEN 其他 complete participants 的相似度存在不同值
- THEN 系統應列出 similarity 最高者為靈魂飯友
- AND 列出 similarity 最低者為飲食天敵
- AND 不得把自己列入 pairing

#### Scenario: similarity 並列
- WHEN 多人具有相同最高或最低 similarity，且最高與最低不同
- THEN 系統應保留所有並列 participants

#### Scenario: 最高與最低相似度相同
- WHEN 所有其他完整作答者的相似度相同
- THEN 飯友與天敵清單均為空
- AND 畫面顯示既有無配對狀態

#### Scenario: 最高與最低相似度不同
- WHEN 至少存在不同的相似度
- THEN 飯友保留所有最高者，天敵保留所有最低者
- AND 不得把自己列入配對

#### Scenario: 只有一位 complete participant
- WHEN 沒有其他完整作答者
- THEN 飯友與天敵清單均為空

## ADDED Requirements

### Requirement: 個人人格卡可在正式揭曉後匯出
系統 SHALL 讓玩家在正式 Reveal 後於個人裝置產生 PNG，支援檔案分享時使用系統分享，否則下載圖片。

#### Scenario: 正式揭曉之前
- WHEN 場次尚未正式揭曉
- THEN 不顯示匯出按鈕

#### Scenario: 匯出隱私
- WHEN 玩家匯出人格卡
- THEN 圖片只含自己的人格名稱、稀有度及金句等個人資訊
- AND 不得含他人暱稱、答案、配對結果或全場成功率
- AND 圖片在本機產生，不上傳或呼叫外部服務
- AND 不包含房號或玩家序號（NEEDS_CONFIRMATION：是否允許加入）

#### Scenario: 雙人關係卡
- WHEN 兩人局的配對相似度相同
- THEN 使用空配對狀態
- AND NEEDS_CONFIRMATION：是否改為完整雙人關係卡，尚未實作
