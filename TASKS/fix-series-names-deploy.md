# 任務：修復 series-names.json 未部署問題

## 問題

`data/series-names.json` 在 Vercel 上回傳 HTML（index.html）而非 JSON，
因為 `copy-assets.js` 只複製 `database.json` 到 dist/，沒有複製 `series-names.json`。

## 需求

1. 修改 `scripts/copy-assets.js`（或 `scripts/fix-html.js`）：
   - 加上複製 `data/series-names.json` 到 `dist/data/series-names.json`
   
2. 確認 `scripts/local-scrape-and-push.sh` 的 git diff 檢測也有包含 series-names.json
   （這個可能已經加了，確認一下）

3. 修改完成後執行 `npx tsc --noEmit` 確保無錯誤

4. 手動觸發 Vercel 部署確認修復

## 檔案位置

- `scripts/copy-assets.js` — build 後的資源複製腳本
- `data/series-names.json` — 系列名稱對照表