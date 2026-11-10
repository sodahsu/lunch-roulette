# 結果揭曉規格增量

## MODIFIED Requirements

### Requirement: 個人人格卡可在正式揭曉後匯出
系統 SHALL 讓玩家在正式 Reveal 後於個人裝置產生 PNG，卡面包含自己人格的插圖，支援檔案分享時使用系統分享，否則下載圖片。

#### Scenario: 正式揭曉之前
- WHEN 場次尚未正式揭曉
- THEN 不顯示匯出按鈕

#### Scenario: 卡面插圖與稀有度外框
- WHEN 玩家匯出人格卡
- THEN 卡面應畫入該人格對應的插圖
- AND 稀有（SSR）卡應有金色外框與稀有度標示，一般卡不得有金色外框
- AND 插圖載入失敗時仍可匯出純文字版卡片

#### Scenario: 匯出隱私
- WHEN 玩家匯出人格卡
- THEN 圖片只含自己的人格名稱、稀有度、金句與該人格插圖
- AND 不得含他人暱稱、答案、配對結果或全場成功率
- AND 圖片在本機產生，不上傳或呼叫外部服務
- AND 不包含房號或玩家序號（NEEDS_CONFIRMATION：是否允許加入）

#### Scenario: 雙人關係卡
- WHEN 兩人局的配對相似度相同
- THEN 使用空配對狀態
- AND NEEDS_CONFIRMATION：是否改為完整雙人關係卡，尚未實作

## ADDED Requirements

### Requirement: 團體成功率卡可在正式揭曉後匯出
系統 SHALL 讓玩家在正式 Reveal 後於結果頁產生只含 aggregate 的團體成功率卡 PNG，支援檔案分享時使用系統分享，否則下載圖片。

#### Scenario: 正式揭曉之前
- WHEN 場次尚未正式揭曉
- THEN 不顯示團體成功率卡的匯出按鈕

#### Scenario: 卡面內容只含 aggregate
- WHEN 玩家匯出團體成功率卡
- THEN 圖片只含成功率百分比、對應的 deterministic verdict、有效人數與日期
- AND 不得含任何參加者暱稱、人格、配對、個人答案、房號或玩家序號
- AND 圖片在本機產生，不上傳或呼叫外部服務

#### Scenario: 有效樣本不足
- WHEN complete participant 少於兩位
- THEN 不顯示團體成功率卡的匯出按鈕
- AND 不得把缺少樣本畫成 0%
