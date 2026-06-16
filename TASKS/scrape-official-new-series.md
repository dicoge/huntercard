# 任務：從官方網站爬取新系列卡片資料

## 背景

hunterCard 資料庫目前有 1113 張卡，但官網（hololive-official-cardgame.com）已有 3 個新系列我們沒收錄。

## 需要爬取的系列

| 代碼 | 商品名 | 預計卡數 | 官網 URL |
|:----:|--------|:--------:|----------|
| hBP08 | バウンサーバウンド | 121 | `https://hololive-official-cardgame.com/cardlist/cardsearch/?expansion=hBP08&view=text&sort=cardnum` |
| hWF01 | ツインウエハース | 34 | `https://hololive-official-cardgame.com/cardlist/cardsearch/?expansion=hWF01&view=text&sort=cardnum` |
| hCO01 | 2025ライブセット | 8 | `https://hololive-official-cardgame.com/cardlist/cardsearch/?expansion=hCO01&view=text&sort=cardnum` |

## 目前 DOM 結構（2026-06-16 確認）

text view 中，每張卡在 `<a href="/cardlist/?id=...">` 內：

```html
<div class="img w100">
  <img src="/wp-content/images/cardlist/hBP08/hBP01-028_C_02.png" alt="IRyS">
</div>
<div class="center-Txtarea txt">
  <p class="number">hBP01-028</p>
  <p class="name">IRyS</p>
  <div class="info">
    <dl>
      <dt>カードタイプ</dt><dd>ホロメン</dd>
      <dt>タグ</dt><dd>#EN #Promise #歌</dd>
      <dt>レアリティ</dt><dd>C</dd>
      <dt>収録商品</dt><dd>ブースターパック バウンサーバウンド</dd>
    </dl>
    <dl class="info_Detail">
      <dt>色</dt><dd><img src="/wp-content/images/icon_white.png"></dd>
      <dt>HP</dt><dd>100</dd>
      <dt>Bloomレベル</dt><dd>Debut</dd>
    </dl>
  </div>
</div>
```

## 需求

### 1. 更新 `scripts/scrape-official-cards.js`

- 改為 ES module（`import` syntax），與專案 `"type": "module"` 一致
- 更新 DOM selector：使用 `.number`、`.name`、`dl dt` + 相鄰 `dd` 方式提取
- 顏色從 img src 的 icon 檔案名判斷（icon_white=white, icon_red=red 等）
- 輸出到 `data/official/cardList_{series}.json`（JSON array 格式）
- 每張卡輸出格式需相容於 `build-database.js` 的 `loadOfficialData()`：

```javascript
{
  cardNumber: "hBP08-001",  // 從 .number 取得
  name: "カード名",          // 從 .name 取得
  cardType: "ホロメン",       // 從 カードタイプ dt → dd
  color: "white",           // 從 img src 的 icon 判斷
  rarity: "C",              // 從 レアリティ dt → dd
  expansion: "hBP08",       // 系列代碼
  series: "hBP08",          // 同 expansion
  imageUrl: "https://hololive-official-cardgame.com/wp-content/images/cardlist/hBP08/hBP01-028_C_02.png",
  hp: "100",                // 從 HP dt → dd（ホロメン才有）
  // 其他欄位可選
}
```

### 2. 注意事項

- `scripts/package.json` 已有 `"type": "module"` — 用 `import puppeteer from 'puppeteer'`
- Puppeteer 在 macOS 用 `/usr/local/bin/chromium` 或 cache 中的 Chrome
- 不設定 `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`
- 使用 text view（`view=text&sort=cardnum`）
- 系列 all 用 `querySelectorAll('a[href*="/cardlist/?id="]')` 
- 每爬一個系列休息 2-3 秒
- 顏色對應：白→white, 緑→green, 赤→red, 青→blue, 紫→purple, 黄→yellow, 無→colorless
- 類型對應：ホロメン→Holomen, 推しホロメン→OshiHolomen, サポート→Support, Buzzホロメン→BuzzHolomen, エール→Yell, LIMITED→Limited

## 產出

執行 `node scripts/scrape-official-cards.js` 後應產出：
- `data/official/cardList_hBP08.json`
- `data/official/cardList_hWF01.json`  
- `data/official/cardList_hCO01.json`

然後 `build-database.js` 的 `loadOfficialData()` 會自動讀取這些檔案。

## 驗證方式

```bash
cd ~/hunterCard
node scripts/scrape-official-cards.js

# 確認產出
python3 -c "
import json, os
for f in ['cardList_hBP08.json','cardList_hWF01.json','cardList_hCO01.json']:
    path = f'data/official/{f}'
    if os.path.exists(path):
        cards = json.load(open(path))
        print(f'{f}: {len(cards)} cards')
    else:
        print(f'{f}: NOT FOUND')
"
```
