# hunterCard 掃描與價格系統 — 技術參考文件

> 最後更新：2026-06-18
> 涵蓋：資料庫結構、掃描流程、價格變體、自動掃描偵測

---

## 一、資料庫結構

### 1.1 資料庫檔案

| 檔案 | 用途 | 特點 |
|------|------|------|
| `data/database.json` | 主資料庫 (1.6MB, 2099 卡) | 含完整 `prices[]` 陣列 (1886 卡有價格) |
| `public/data/database.json` | 舊版前端用（已淘汰） | 無 `prices` 欄位 |
| `dist/data/database.json` | 部屬用（Vercel 實際讀取） | 由 `fix-html.js` 在 build 時從 `data/` 複製 |
| `data/series-names.json` | 系列名稱對照（人類可讀） | 如 `hBP04` → `キュリアスユニバース` |

### 1.2 資料庫 Key 結構

每張卡的 ID 是複合鍵：`cardNumber_series`

```json
{
  "hBP01-024_ent07": {
    "id": "hBP01-024_ent07",
    "cardNumber": "hBP01-024",
    "name": "ベスティア・ゼータ",
    "series": "ent07",
    "rarity": "HR",
    "sellPrice": 3980,
    "prices": [
      {"name": "ベスティア・ゼータ(パラレル/HR)", "sellPrice": 3980},
      {"name": "ベスティア・ゼータ(パラレル/hBP07)", "sellPrice": 50}
    ],
    "officialImage": "https://...",
    "localImage": ""
  }
}
```

### 1.3 多版本（Variants）

同一張卡（相同 `cardNumber`）可能出現在不同系列作為復刻版。

- 總計 583 張卡有 2+ 個版本
- `hSD01-017`（マネちゃん）有最多 19 個版本
- 大部分復刻版價格相同，少數因稀有度不同價格有異
- 例外：`hBP01-104`（ふつうのパソコン）18 版，所有價格均 ¥2,480

### 1.4 價格變體（prices 陣列）

`prices[]` 陣列記錄同一張卡的不同價格點：
- パラレル（平行版本）通常有不同價格
- HR/UR 等高稀有度版本價格更高
- 同張卡在不同系列復刻版可能價格不同

---

## 二、CardInfo 型別定義

位於 `src/services/cardRecognition.ts`

```typescript
interface CardPrice {
  name: string;           // 如 "ベスティア・ゼータ(パラレル/HR)"
  sellPrice: number | null;
  rarity?: string;
}

interface CardVariant {
  series: string;         // 系列代碼如 "hBP04"
  seriesName: string;     // 人類可讀名稱如 "ブルーミングレディアンス"
  sellPrice: number | null;
  prices: CardPrice[];
  rarity: string;
}

interface CardInfo {
  id: string;             // 複合鍵 "hBP01-024_ent07"
  name: string;
  cardNumber: string;     // "hBP01-024"
  type: string;
  rarity: string;
  series: string;
  sellPrice: number | null;  // 主價格（取最高價版本）
  yuyuName: string;
  color: string;
  imageUrl: string;
  prices?: CardPrice[];       // 原始價格變體陣列
  variants?: CardVariant[];   // 同一 cardNumber 的其他系列版本
}
```

---

## 三、loadAllCards 邏輯

位於 `src/services/cardRecognition.ts` 的 `loadAllCards()`

**流程：**
1. 並行載入 `database.json` + `series-names.json`
2. 依 `cardNumber` 分組所有 entry
3. 每組選 `sellPrice` 最高的作為主卡片
4. 其餘 entry 變成 `variants[]` 陣列
5. 保留主卡片的 `prices[]` 原始陣列

**前端 fetch 路徑：** `/data/database.json`（在 build 時從 `data/database.json` 複製到 `dist/`）

---

## 四、卡牌辨識流程

### 4.1 完整 Pipeline

```
用戶點擊掃描/自動偵測觸發
  → captureAndRecognize()
    → takePictureAsync() 拍照
    → performOcr(photo.uri) 文字辨識
       ├── Web: 使用 Tesseract.js (recognizeTextWeb)
       └── Native: 使用 expo-ocr-kit
    → recognizeCardFromOcr(trimmedText) 卡牌匹配
       ├── Step 1: extractCardIds() 從文字提取卡號模式
       ├── Step 2: 逐行匹配（cleanOcrText → recognizeCard）
       └── Step 3: 全文模糊比對
    → 成功 → setResultCard({ card, visible: true })
    → 失敗 → setSearchError + showSearchResults
```

### 4.2 OCR 文字清理 (cleanOcrText)

- 分行過濾：HP、DMG、ATK 等數值 → 過濾
- 效果文字（この/自分の/ターン）→ 過濾
- 保留：含卡號的行 > 含日文的短行 > 其他
- 正規化：全形→半形、統一連字號、O→0、lI→1

### 4.3 卡號提取 (extractCardIds)

正則模式：
- `hBP04-001` 格式
- `BP04-001`（自動補 h 前綴）
- `PR-002` 格式

### 4.4 模糊匹配策略 (recognizeCard)

1. 卡號精確匹配（大小寫不敏感）
2. 名稱完全匹配
3. 卡號前綴匹配
4. 名稱包含匹配
5. 多關鍵字評分
6. 反向包含匹配
7. ID 片段匹配
8. Levenshtein 距離模糊匹配（threshold > 0.3）

---

## 五、自動掃描系統

### 5.1 架構

```
rAF loop（requestAnimationFrame）
  → analyzeFrameWithStability(video, scanArea)
    → analyzeFrame() Canvas 亮度 + 邊緣檢測
    → 5 幀歷史緩衝穩定性檢查
  → isStable && confidence > 0.7
    → 3 秒冷卻檢查
    → 自動觸發 captureAndRecognize()
  → 成功後 resetAutoScan() 重置
```

### 5.2 Frame 分析演算法

**亮度計算：** 取掃描區域 pixel 資料的 RGB 平均值
**邊緣檢測：** Sobel 水平梯度（4-鄰域）
**卡牌判定：** brightness 0.15-0.85, edgeDensity > 0.08
**穩定判斷：** 連續 5 幀都有卡 + brightness variance < 0.15

### 5.3 適用平台

- **Web：** 自動掃描 ✅（Canvas frame 分析）
- **Native：** 純手動掃描（expo-camera 無 frame 存取 API）

---

## 六、檔案關係圖

```
data/database.json (主資料庫，含 prices[])
  ├── copiado por fix-html.js durante build
  │   └── dist/data/database.json (Vercel 部屬版)
  │
  ├── src/services/cardRecognition.ts
  │   ├── loadAllCards() → 讀取 + 分組
  │   ├── recognizeCard() → 文字比對
  │   └── recognizeCardFromOcr() → OCR pipeline
  │
  ├── src/services/autoScanService.ts
  │   ├── analyzeFrame() → Canvas 分析
  │   ├── analyzeFrameWithStability() → 穩定檢測
  │   └── resetAutoScan() → 重置
  │
  └── src/components/ScanResultCard.tsx
      └── 顯示價格 + variants/prices 區塊

data/series-names.json
  └── src/components/ScanResultCard.tsx
      └── variant.seriesName 顯示人類可讀名稱
```

---

## 七、相關檔案列表

| 檔案 | 行數 | 功能 |
|------|------|------|
| `src/screens/ScanScreen.tsx` | ~1311 | 主掃描畫面 + auto-scan rAF loop |
| `src/services/cardRecognition.ts` | ~501 | 卡牌比對 + 價格查詢 + 資料庫載入 |
| `src/services/autoScanService.ts` | 138 | Frame 分析引擎 |
| `src/components/ScanOverlay.tsx` | 433 | 掃描覆蓋元件 |
| `src/components/ScanResultCard.tsx` | 385 | 浮動價格卡（含多價格） |
| `src/components/WebCamera.tsx` | 187 | Web 相機元件 |
| `src/components/ScanSessionPanel.tsx` | 317 | 掃描面板 |
| `src/stores/scanSessionStore.ts` | 89 | 掃描 session store |
| `scripts/fix-html.js` | 77 | Build 時複製 database.json 到 dist |
| `data/database.json` | ~55K 行 | 主資料庫 |
| `data/series-names.json` | ~35 項 | 系列名稱對照 |

---

## 八、常見問題

### Q: 為什麼掃到的價格只有一個？
A: 卡片有多版本時，點擊「▼ 查看其他版本」展開，可以看到所有系列的價格。

### Q: 為什麼自動掃描沒作用？
A: 自動掃描僅限 Web 版（iOS Safari/桌面 Chrome）。Native App 需手動點掃描按鈕。

### Q: 為什麼價格顯示「—」？
A: 該卡片在 yuyu-tei 和官方資料庫都沒有交易記錄，顯示「暫無資料」。

### Q: OCR 辨識不準怎麼辦？
A: 可以使用「🔤 手動搜尋」輸入卡號（如 `hBP04-001`）直接查詢。

### Q: build 後價格沒更新？
A: Vercel 的 CDN 可能有快取，等幾分鐘後強制刷新（Cmd+Shift+R）。