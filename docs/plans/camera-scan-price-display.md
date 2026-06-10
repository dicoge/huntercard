# 相機掃描卡片顯示價格 — Implementation Plan

> **Goal:** 讓相機掃描 Hololive 卡片後，顯示完整的卡牌資訊 + 價格（含「尚無交易」）
>
> **Architecture:** 重構 cardRecognition.ts 改用 database.json，優化 ScanScreen 掃描流程，掃描後顯示精美結果卡
>
> **Tech Stack:** Expo + React Native + TypeScript + database.json

---

## 當前問題

1. `cardRecognition.ts` 吃 `data/yuyu-prices/yuyu-prices.json` → 完全空的（0 筆資料）
2. 掃描後只用 toast 顯示簡單價格，沒有完整卡牌資訊（稀有度、系列、價格狀態）
3. OCR 搭配 fuzzy match 的流程有多個 alert dialog，UX 不流暢
4. `CardInfo` interface 太簡陋（id, name, sellPrice 而已）

---

### Task 1: 重構 cardRecognition.ts 改用 database.json

**Objective:** 讓 cardRecognition 從新的 database.json 讀取資料，回傳完整卡牌資訊

**Files:**
- Modify: `src/services/cardRecognition.ts` (全部重寫)
- Remove: 不再需要 `data/yuyu-prices/yuyu-prices.json`

**改動要點：**
```typescript
// 新增完整 CardInfo interface
export interface CardInfo {
  id: string;
  name: string;
  cardNumber: string;
  type: string;
  rarity: string;
  series: string;
  sellPrice: number | null;
  yuyuName: string;
  color: string;
  hp: string;
  life: string;
  imageUrl: string;
}

// 載入 database.json（而非舊的 yuyu-prices.json）
export function loadAllCards(): CardInfo[] {
  // fetch /data/database.json (client-side 用 fetch)
  // 或 static import
}

// 識別卡牌 — 支援卡號精確匹配、名稱模糊匹配
export function recognizeCard(searchText: string): RecognitionResult {
  // 1. 精確匹配卡號 (hBP04-001)
  // 2. 名稱包含匹配
  // 3. 模糊相似度匹配
  // 4. 回傳完整 CardInfo + sellPrice 可為 null（用於「尚無交易」）
}

// getCardPrice 回傳 sellPrice（可 null）
// searchCards 支援多欄位搜尋
```

**驗證：** `npx tsc --noEmit` 無錯誤

---

### Task 2: 優化 ScanScreen 掃描結果顯示

**Objective:** 掃描成功後顯示精美結果卡（含稀有度、系列、價格），替代簡單 toast

**Files:**
- Modify: `src/screens/ScanScreen.tsx` (掃描結果區塊)

**改動要點：**
```typescript
// 掃描結果顯示替代 toast — 改用半透明 modal 或 bottom sheet
// 顯示:
// - 卡牌編號 (cardNumber)
// - 名稱 (日文+中文)
// - 稀有度 badge (顏色對應)
// - 系列名稱
// - 價格區塊: 有價→¥xxx，無價→尚無交易
// - 按鈕: 查看詳情 / 繼續掃描
```

---

### Task 3: 改善 OCR 匹配精準度

**Objective:** OCR 識別文字後更精準匹配 database 中的卡牌

**Files:**
- Modify: `src/services/cardRecognition.ts`

**改動要點：**
```typescript
// OCR 文字通常會讀到卡號 + 日文名
// 優先匹配卡號 pattern：/^[a-z]+\d{2}-\d{3}$/i
// 若無卡號，用名稱 similarity match
// 回傳前 3 筆建議讓用戶選（若信心不足）
```

---

### Task 4: 更新 ScanSessionPanel 使用新資料格式

**Objective:** 確保已掃描卡片的 session panel 使用新 CardInfo

**Files:**
- Modify: `src/components/ScanSessionPanel.tsx` (若需要)
- Modify: `src/stores/scanSessionStore.ts` (若需要)

---

### Task 5: 清理舊檔案 + TS compile 驗證

**Objective:** 刪除不再需要的舊檔案，確認 TypeScript 無誤

**Files:**
- Remove: `data/yuyu-prices/yuyu-prices.json`
- Remove: `data/yuyu-prices/` (整目錄，若沒其他檔案)

**驗證：** `npx tsc --noEmit` → 0 errors

---

## 執行順序

1. Task 1: 重構 cardRecognition.ts
2. Task 2: 優化掃描結果顯示
3. Task 3: 改善 OCR 匹配精準度
4. Task 4: 更新 session panel
5. Task 5: 清理 + 驗證
6. Codex Code Review
7. Vercel Deploy