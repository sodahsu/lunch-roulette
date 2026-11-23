# 設計

## 做法
`src/lib/share-card.ts` 的 `roundRect` helper 在畫路徑前檢查 context 是否有原生 `roundRect`：
- 有：沿用原生呼叫，行為與先前完全相同。
- 沒有：用 `moveTo` 加四次 `arcTo` 與 `closePath` 畫同一個路徑。

兩條路徑的一致性靠三個約定維持：起點在上緣、由左往右（`x + r, y`）；順時針畫四個圓角；半徑上限取 `min(r, w / 2, h / 2)`，與原生對單一半徑的處理相同。卡片使用的圓角矩形都是正寬高，不需要處理負值。

## 使用者看到什麼
匯出失敗時，`App.vue` 的 `runShare` 會吞掉使用者取消分享的 `AbortError`，其餘錯誤把 `error.message` 放進頁面頂端的 `role="alert"` 提示條。修正前 iOS 16 以下會看到瀏覽器引擎的原始 TypeError 字串，沒有任何下載或分享。修正後這條路徑不再因為圓角矩形觸發。`App.vue` 不需要改。

## 驗證
Vitest 在 node 環境以假的 2D context 跑完整產卡流程：
- 沒有 `roundRect` 時，人格卡（一般與 SSR）與團體卡都不丟例外、完成分享，且路徑走 `moveTo` / `arcTo` / `closePath`；
- 有 `roundRect` 時，仍呼叫原生、不走 fallback。
實際像素是否一致與 iOS 16 以下實機分享，單元測試無法證明，列為人工確認。
