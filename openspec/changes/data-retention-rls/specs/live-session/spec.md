## ADDED Requirements

### Requirement: Room privacy must be verified by negative RLS tests
系統 MUST 在隔離測試資料庫驗證參與者不能跨房讀取他人答案、未加入者不能讀取玩家資料、鎖定後不能修改答案或加入。

#### Scenario: Outsider attempts response access
- **GIVEN** 兩個房間與獨立使用者已有回覆
- **WHEN** outsider 帶著自己的身分讀取回覆與玩家
- **THEN** MUST 回傳零筆，不得洩漏他人答案

#### Scenario: Locked room modification
- **GIVEN** 會話狀態為 locked
- **WHEN** 參與者嘗試改寫答案或新使用者嘗試加入
- **THEN** MUST 拒絕修改與加入

### Requirement: Retention must be an explicit decision
系統 MUST 在負責人核准期限、UX、隱私告知及回滾計畫前維持現有資料保留行為，不可自行設定定時刪除。

#### Scenario: No approved retention duration
- **GIVEN** 負責人尚未選定保留期限
- **WHEN** 開發者提出清理工作
- **THEN** MUST 不對正式資料庫啟用刪除工作
