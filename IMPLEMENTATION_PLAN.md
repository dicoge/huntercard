# hunterCard 資料庫統合 + 圖片儲存 + CI 強固 實作計劃

## 背景
目前卡片資料分散多處，脆弱且無圖片：
- `data/official/*.json` — 官方卡號/名稱/類型/顏色/imageUrl
- `data/yuyu-prices/yuyu-prices.json` — 僅價格，無圖片
- `api/search.ts` — 每次查詢動態 fetch 外部 GitHub raw，極脆弱
- `CardDetailScreen.tsx` — 直接 import yuyu-prices.json + 動態拼官方圖片 URL

目標：**統一成一個 database.json + 圖片下載到 repo**，一切自給自足。

---

## 第一部分：database.json 結構

新的統一資料庫檔：`data/database.json`

```json
{
  "lastUpdated": "2026-05-27T12:00:00.000Z",
  "totalCards": 674,
  "source": "hunterCard unified database",
  "cards": {
    "hBP04-001": {
      "id": "hBP04-001",
      "name": "博衣こより",
      "type": "Oshi",
      "color": "white",
      "rarity": "OSR",
      "series": "hBP04",
      "sellPrice": 89800,
      "yuyuName": "博衣こより(パラレル/サイン)",
      "yuyuImage": "/images/hBP04-001_yuyu.jpg",
      "officialImage": "https://hololive-official-cardgame.com/wp-content/images/cardlist/hBP04/hBP04-001_OSR.png",
      "localImage": "/images/hBP04-001.jpg",
      "effects": ["給予...","抽..."],
      "timestamp": "2026-05-14T17:03:35.100Z"
    }
  }
}
```

**原則：**
- 用扁平化 `cards` object，key=cardNumber，便於 O(1) 查詢
- `localImage` = 我們自己下載並儲存的圖片路徑（優先使用）
- `yuyuImage` = yuyu-tei 的圖片 URL（備用）
- `officialImage` = 官方圖片 URL（備用）
- 沒有 yuyu-tei 價格的卡片（如新系列）也要保留基本資料（from official data）

---

## 第二部分：Scraper 改寫

### 檔案：`scripts/build-database.js`（全新檔案，保留舊的 scrape-yuyu-prices.js 不動）

流程：
1. **讀取所有 `data/official/*.json`** → 取得完整卡片基本資料（名稱、類型、顏色、系列、官方 imageUrl）
2. **從 yuyu-tei 抓價格 + 圖片**（沿用現有 Puppeteer 爬蟲邏輯）
   - 從 `.card-product` 中抓：`img[src*=card.yuyu-tei]` 的 src
   - 用 `cart_ver` + `cart_cid` 也可以建構圖片 URL
3. **下載圖片到 `data/images/`**
   - 檔名規則：`{cardNumber}.jpg`（如 `hBP04-001.jpg`）
   - **增量下載**：先檢查 `data/images/{cardNumber}.jpg` 是否存在，存在就跳過
   - 只下載新卡片或圖片不存在的卡片
   - 用 `http.get` 或 `https.get` + `fs.createWriteStream`
4. **合併資料產出 `data/database.json`**
   - official data 為基底，加上 yuyu 價格 + 圖片路徑
5. **安全檢查**
   - totalCards < 50 → throw error，不寫入 database.json

```javascript
const fs = require('fs');
const path = require('path');
const https = require('https');

async function downloadImage(url, destPath) {
  // Check if already exists
  if (fs.existsSync(destPath)) return;
  // Download
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}
```

### Vercel 靜態圖片服務
在 `vercel.json` 中確保 `data/images/` 可被靜態存取：
```json
{
  "buildCommand": "expo export --platform web && node scripts/fix-html.js",
  "outputDirectory": "dist",
  "rewrites": [...]
}
```
Vercel 部署時要將 `data/images/` 放到 `dist/images/` 或透過 API route 提供。

**方案A：build 時複製到 dist**
在 build command 中加上：
```bash
mkdir -p dist/images && cp -r data/images/* dist/images/
```

**方案B：API route**
用 `api/get-image.ts` 從 `data/images/` 讀取並回傳。

建議用方案A（最簡單，CDN 直接快取）。

---

## 第三部分：API 改寫

### `api/search.ts`
- 移除所有外部 fetch（holotcgtw, official GitHub raw, yuyu-tei GitHub raw）
- 改為直接 `import` 或 `readFileSync` 讀取本地 `data/database.json`
- 查詢邏輯不變：id, name, series, color, tags
- `imageUrl` 優先回傳 `localImage`（我們自己的圖片），備用 `officialImage`
- Cache-Control: `public, max-age=300`（5分鐘）

### `api/get-image.ts`
- 讀取 `data/images/{filename}` 並回傳 image/jpeg
- 加 Cache-Control: `public, max-age=86400`（24小時，圖片不太變動）

---

## 第四部分：CI Workflow 強化

### 檔案：`.github/workflows/scrape-yuyu-prices.yml`（修改現有）

```yaml
name: Scrape & Build Database

on:
  schedule:
    - cron: '0 20 * * *'   # 每天 5:00 JST
  workflow_dispatch:

jobs:
  build-database:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }

      - name: Install dependencies
        working-directory: scripts
        run: npm ci

      - name: Install Chrome
        run: |
          wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
          echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
          sudo apt-get update
          sudo apt-get install -y google-chrome-stable

      - name: Run scraper & build database
        working-directory: scripts
        run: PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true node build-database.js

      - name: Validate database
        run: |
          CARD_COUNT=$(python3 -c "import json; d=json.load(open('data/database.json')); print(d.get('totalCards',0))")
          echo "Database has $CARD_COUNT cards"
          if [ "$CARD_COUNT" -lt 50 ]; then
            echo "❌ SAFETY CHECK FAILED: totalCards=$CARD_COUNT < 50"
            exit 1
          fi
          echo "✅ Validation passed"

      - name: Check for changes
        id: check
        run: |
          if git diff --stat -- 'data/database.json' 'data/images/' | grep -q .; then
            echo "changed=true" >> $GITHUB_OUTPUT
          else
            echo "changed=false" >> $GITHUB_OUTPUT
          fi

      - name: Commit and push if changed
        if: steps.check.outputs.changed == 'true'
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add data/database.json data/images/
          git diff --staged --quiet || git commit -m "chore: update database $(date +%Y-%m-%d)"
          git push origin main

      - name: Deploy to Vercel via Deploy Hook
        if: steps.check.outputs.changed == 'true'
        run: curl -X POST ${{ secrets.VERCEL_DEPLOY_HOOK }}
```

### 設定 Vercel Deploy Hook
1. 在 Vercel Dashboard → hunterCard project → Settings → Git → Deploy Hooks → 新增 Hook
2. 取得 Hook URL
3. 設為 GitHub Secret: `VERCEL_DEPLOY_HOOK`
4. Workflow 中用 `curl -X POST ${{ secrets.VERCEL_DEPLOY_HOOK }}`

---

## 第五部分：Vercel Build Script 更新

### `scripts/fix-html.js`（或另建 `scripts/copy-images.js`）

確保 database.json 和 images 在 build 時被複製到 dist：

```javascript
// scripts/copy-assets.js
const fs = require('fs');
const path = require('path');

// Copy database.json
fs.copyFileSync('data/database.json', 'dist/data/database.json');

// Copy images
const imagesDir = 'dist/images';
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, {recursive: true});
const images = fs.readdirSync('data/images');
images.forEach(f => {
  fs.copyFileSync(path.join('data/images', f), path.join(imagesDir, f));
});
console.log(`✅ Copied ${images.length} images to dist/images/`);
```

更新 `vercel.json` 的 buildCommand：
```json
{
  "buildCommand": "expo export --platform web && node scripts/fix-html.js && node scripts/copy-assets.js",
  "outputDirectory": "dist"
}
```

---

## 實作順序

1. **寫 `scripts/build-database.js`** — 全新統合爬蟲（最核心）
2. **寫 `scripts/copy-assets.js`** — build 時複製圖片+資料庫到 dist
3. **更新 `vercel.json`** — build command + static images
4. **更新 `api/search.ts`** — 改用 database.json
5. **更新 `.github/workflows/scrape-yuyu-prices.yml`** — 加防呆 + Deploy Hook
6. **設定 Vercel Deploy Hook** — 手動設定後設為 GitHub Secret
7. **本地測試** — 跑 build-database.js 確認正常
8. **推上 GitHub 測試 CI**