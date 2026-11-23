# 場次規格增量

## MODIFIED Requirements

### Requirement: 主持人可以建立可分享的開放場次
The system SHALL allow a host to create a new session in the `open` state.

#### Scenario: 建立新場次
- WHEN 主持人建立新局
- THEN 系統應建立唯一房號
- AND 新場次應使用 questionnaire version `v0.3`
- AND 主持人畫面應顯示房號
- AND 主持人畫面應提供對應該房號的加入 QR Code

#### Scenario: 進行中的舊版本場次
- WHEN 場次建立時的 questionnaire version 為 `v0.1` 或 `v0.2`
- THEN 該場次應持續使用原版本的題目與演算法
- AND 不得因新場次改用 `v0.3` 而被改版
