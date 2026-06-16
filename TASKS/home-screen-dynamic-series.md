# 任務：HomeScreen + SearchResultsScreen 改為從資料庫動態讀取系列

## 背景
首頁快速搜尋的系列按鈕（BOOSTER_PACKS、STARTER_DECKS、SPECIAL）目前是寫死的陣列，新系列要手動加。要改成從 `database.json` 動態讀取。

## 資料來源

### 1. `data/database.json`（已在線上）
每張卡有 `series` 欄位（如 "hBP08"），從中可提取所有唯一 series 代碼。

### 2. `data/series-names.json`（已建立）
系列代碼 → 顯示名稱對照表，如：
```json
{
  "hBP08": "バウンサーバウンド",
  "hWF01": "ツインウエハース",
  "hCO01": "2025ライブセット",
  ...
}
```

## 需求

### 1. 修改 `src/screens/HomeScreen.tsx`

- 刪除 `BOOSTER_PACKS`、`STARTER_DECKS`、`SPECIAL` 三個硬編碼陣列
- 改為在 component mount 時 fetch `/data/database.json` 和 `/data/series-names.json`
- 從 `database.json.cards` 提取所有唯一的 `series` 值
- 根據 series 代碼前綴自動分類：
  - `hBP` → ブースターパック（Booster Packs）
  - `hSD` → スタートデッキ（Starter Decks）
  - 其他 → 特殊・PR（Special）
  - PR 系列（hPR, hY, ent07 等）→ 特殊・PR
- 每個按鈕顯示：`label`（系列代碼）+ `name`（從 series-names.json 查）
- 按系列代碼排序
- 加入 loading state（fetch 中顯示 ActivityIndicator）
- 保持現有 UI 樣式不變

### 2. 修改 `src/screens/SearchResultsScreen.tsx`

- 刪除硬編碼的 `SERIES_NAMES` 物件（第 7-17 行）
- 改為 fetch `/data/series-names.json` 並 cache（module-level）
- 搜尋結果顯示系列名稱時，改從這個 cache 查找
- 搜尋邏輯不變

## 注意事項

- `HomeScreen.tsx` 現有分類順序：Booster Packs → Starter Decks → Special
- 每個分類內按 series 代碼排序（hBP01 < hBP02 < ... < hBP08）
- Color quick access 按鈕保持不變
- fetch 失敗時用 fallback（series 代碼本身當顯示名稱）
- 用 `useEffect` + `useState` 管理非同步載入
- module-level cache 避免重複 fetch（參考 SearchResultsScreen 現有的 `cachedDatabase` 模式）