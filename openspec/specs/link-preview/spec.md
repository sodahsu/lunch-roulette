# link-preview Specification

## Purpose
定義網站入口 HTML 的社群連結預覽標籤、預覽圖與 favicon，使房間連結貼進聊天室或社群時不是空白預覽，且預覽內容不含任何場次或玩家資訊。

## Requirements

### Requirement: 連結貼到聊天室時要有預覽
系統 SHALL 在入口 HTML 提供社群預覽標籤、1200×630 預覽圖與 favicon，使房間連結貼進聊天室或社群時不是空白預覽。

#### Scenario: 預覽標籤
- WHEN 爬蟲或瀏覽器讀取入口 HTML
- THEN 應有 og:title、og:description、og:image 與對應的 twitter 卡片標籤
- AND og:image 應為絕對網址，指向 1200×630 的靜態圖
- AND 該靜態圖必須可由網站直接取得

#### Scenario: 預覽不含場次資訊
- WHEN 房間連結帶有房號
- THEN 預覽標籤與預覽圖不得包含房號或玩家序號
- AND 所有房間連結共用同一份預覽（NEEDS_CONFIRMATION：是否允許依房號客製）

#### Scenario: Favicon
- WHEN 瀏覽器請求 `/favicon.ico`
- THEN 系統應回傳圖示而不是 404
