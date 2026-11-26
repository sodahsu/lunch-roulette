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

### Requirement: Expired sessions and dependent data must be deleted
系統 MUST 每日清理到期場次：已揭曉場次以 `revealed_at` 起算 30 天，未揭曉場次以 `created_at` 起算 30 天；場次的參加者、作答及結果資料 MUST 依外鍵 cascade 刪除。

#### Scenario: Revealed and unrevealed retention periods
- **GIVEN** 已揭曉場次的揭曉時間、未揭曉場次的建立時間分別超過 30 天
- **WHEN** 每日排程執行
- **THEN** MUST 刪除兩類到期場次及其相依資料，保留未滿 30 天的場次

### Requirement: Retention cleanup is observable and reversible before data deletion
系統 MUST 提供唯讀 dry-run 分別計數兩類到期場次，並提供只停止未來排程、移除清理函式的 rollback；rollback MUST NOT 聲稱會恢復已刪資料。

#### Scenario: Preview and disable cleanup
- **GIVEN** 維護者檢視目前到期資料或需停止排程
- **WHEN** 執行唯讀 dry-run 或 rollback migration
- **THEN** dry-run MUST 分別回報已揭曉與未揭曉的筆數，rollback MUST 停止排程而不還原已刪資料

#### Scenario: Unavailable share link
- **GIVEN** 分享連結的房號已過期或不存在
- **WHEN** 玩家開啟連結
- **THEN** MUST 提示連結可能已過期，讓玩家輸入正確房號或向主持人索取新房號
