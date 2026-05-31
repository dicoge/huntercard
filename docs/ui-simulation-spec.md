# 模擬實戰（TutorialSimulation）UI 規格書

> **專案：** HoloHunter（hOCG 卡牌查價 App）
> **技術棧：** Expo + React Native Web + TypeScript
> **畫面：** TutorialSimulationScreen
> **核心元件：** SimulationBoard、SimulationStepCard
> **資料來源：** `tutorialSimulationData.ts`（7 階段、20 步驟）
> **最後更新：** 2025-07-17

---

## 目錄

1. [畫面佈局](#1-畫面佈局)
2. [Game Board（SimulationBoard）](#2-game-boardsimulationboard)
3. [Step Card（SimulationStepCard）](#3-step-cardsimulationstepcard)
4. [Mobile 適配](#4-mobile-適配)
5. [互動邏輯](#5-互動邏輯)
6. [資料結構](#6-資料結構)
7. [依賴組件與路由](#7-依賴組件與路由)

---

## 1. 畫面佈局

### 1.1 整體結構

TutorialSimulationScreen 採用**由上至下垂直堆疊**的佈局結構，由五個主要區域組成：

```
┌──────────────────────────────────────┐
│  Top Bar（頂部標題列）                 │
│  🎮 模擬實戰 / 跟著步驟體驗一場對局      │
├──────────────────────────────────────┤
│  Progress Bar（進度條）               │
│  ████████░░░░░░░░  階段 1/7          │
├──────────────────────────────────────┤
│  ScrollView（可滾動內容區）            │
│  ┌──────────────────────────────────┐│
│  │  Game Board（遊戲盤面）           ││
│  │  3×3 Zone Grid                  ││
│  │  (SimulationBoard)              ││
│  ├──────────────────────────────────┤│
│  │  Step Card（步驟卡片）            ││
│  │  Phase Indicator                 ││
│  │  Step Content (scrollable)       ││
│  │  Navigation Buttons              ││
│  │  (SimulationStepCard)            ││
│  └──────────────────────────────────┘│
└──────────────────────────────────────┘
```

### 1.2 各區域的職責說明

| 區域 | 組件 | 職責 |
|------|------|------|
| **Top Bar** | `SafeAreaView` + `View` | 顯示畫面標題「🎮 模擬實戰」與副標題「跟著步驟體驗一場對局」；處理 Safe Area 邊距 |
| **Progress Bar** | `View` 自繪 | 顯示整體進度百分比（填色條 + 階段文字），讓使用者了解當前位於哪個階段 |
| **Game Board** | `SimulationBoard` | 以 3×3 網格呈現 hOCG 實際盤面，根據當前步驟高亮對應 zone，可顯示縮圖卡片 |
| **Step Card** | `SimulationStepCard` | 呈現當前步驟的詳細說明，包含階段標頭、步驟內容、提示區塊、導航按鈕 |
| **ScrollView** | React Native `ScrollView` | 包裹 Board 與 Step Card，在內容過長時可垂直滾動，確保在小螢幕上的可用性 |

### 1.3 手機版與桌機版的差異

| 項目 | 桌機版（寬度 ≥ 480px） | 手機版（寬度 < 480px） |
|------|------------------------|------------------------|
| 斷點條件 | `screenWidth >= 480` | `screenWidth < 480`（`MOBILE_BREAKPOINT`） |
| Top Bar padding | `paddingHorizontal: 20` | `paddingHorizontal: 14` |
| Top Bar 字型 | 標題 20px、副標 12px | 標題 17px、副標 11px |
| Progress 間距 | `paddingHorizontal: 20`、`paddingVertical: 8` | `paddingHorizontal: 14`、`paddingVertical: 6` |
| Progress 文字 | 12px，minWidth 80 | 11px，minWidth 70 |
| Board 高度計算 | `min(screenHeight * 0.4, 320)` | `min(screenHeight * 0.28, 200)` |
| Board Zone 尺寸 | 正方形（`aspectRatio: 1`） | 固定高度 50px（無 aspectRatio） |
| Step Card radius | `borderRadius: 20`，padding: 20 | `borderRadius: 14`，padding: 14 |
| Step Card margin | `marginHorizontal: 16` | `marginHorizontal: 12` |
| 按鈕尺寸 | paddingVertical: 12, paddingHorizontal: 16 | paddingVertical: 10, paddingHorizontal: 12 |
| ScrollView maxHeight | 280px | 180px |
| Zone 間距 | gap: 5, marginBottom: 5 | gap: 4, marginBottom: 4 |
| Zone border | borderRadius: 10, borderWidth: 1.5 | borderRadius: 8, borderWidth: 1 |
| Zone 表情符號 | 22px | 18px |
| Zone 標籤文字 | 9px | 8px |

---

## 2. Game Board（SimulationBoard）

### 2.1 3×3 Zone Grid 說明

`SimulationBoard` 以 3 行 × 3 列的網格構成，模擬 hOCG 實體卡牌的標準盤面配置。

```
┌──────────┬──────────┬──────────┐
│  主推     │  中心     │  聯動     │
│  (oshi)  │ (center)  │ (collab) │
├──────────┼──────────┼──────────┤
│  後台     │  牌組     │  能量     │
│(backstage)│  (deck)  │ (energy) │
├──────────┼──────────┼──────────┤
│  生命     │  吶喊     │  存檔     │
│  (life)  │(cheerDeck)│(archive) │
└──────────┴──────────┴──────────┘
```

### 2.2 各 Zone 的對應

| Zone ID | 顯示名稱 | Grid Area | Emoji | 說明 |
|---------|----------|-----------|-------|------|
| `oshi` | 主推位置 | `topLeft` | ⭐ | 放置主推（Oshi）成員卡的位置 |
| `center` | 中心位置 | `topCenter` | 🎯 | 舞台中央的主力成員 |
| `collab` | 聯動位置 | `topRight` | 🔗 | 聯動中的成員位置 |
| `backstage` | 舞台後方 | `midLeft` | 🎪 | 待機中的後台成員 |
| `deck` | 牌組 | `midCenter` | 📚 | 牌堆放置區 |
| `energy` | 能量區 | `midRight` | ⚡ | Holo 能量卡放置區 |
| `life` | 生命區 | `botLeft` | ❤️ | 生命值卡片區 |
| `cheerDeck` | 吶喊牌組 | `botCenter` | 📣 | 吶喊（Cheer）牌組區 |
| `archive` | 存檔區 | `botRight` | 📦 | 已使用或棄牌的存檔區 |

### 2.3 Highlight Zone 的視覺效果

當某個 zone 被設為 `highlightZone` 時（透過 `currentStep.highlightZone` 傳入），該 zone 會套用以下樣式變化：

```typescript
// 高亮樣式（styles.zoneHighlighted）
{
  borderColor: '#ff6b9d',      // COLORS.primary（hololive 粉紅）
  borderWidth: 2.5,             // 加粗邊框（預設 1.5）
  backgroundColor: '#252542',   // COLORS.surfaceLight（較亮背景）
  shadowColor: '#ff6b9d',       // 粉紅陰影
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
  elevation: 6,                 // Android 陰影
}
```

此外，zone 標籤文字也會變色：
```typescript
// 高亮標籤樣式（styles.zoneLabelHighlighted）
{
  color: '#ff6b9d',   // COLORS.primary
  fontWeight: '700',  // 加粗
}
```

高亮的觸發條件為：`highlightZone === zone.id || cardZone === zone.id`。

### 2.4 Card Ref 圖片置入邏輯

當 `currentStep.cardRef` 有值時，對應 zone 會顯示卡牌圖片而非預設的表情符號。圖片置入邏輯由 `getCardZone()` 函數決定：

```typescript
const getCardZone = (): string | null => {
  if (!cardRef) return null;
  if (cardRef.name.includes('推し')) return 'oshi';     // 主推卡 → 主推位置
  if (cardRef.name.includes('ホロメン')) return 'backstage'; // 成員卡 → 後台
  return null;
};
```

圖片渲染在 `ZoneBox` 元件中：

```tsx
{cardRef && cardRef.imageUrl ? (
  <Image
    source={{ uri: cardRef.imageUrl }}
    style={styles.cardThumb}   // width: '80%', height: '80%', borderRadius: 6
    resizeMode="contain"
  />
) : (
  // 顯示預設 emoji
)}
```

**目前定義的 CardRef 資源：**

| 常數 | ID | 名稱 | 對應 Zone | 圖片 URL |
|------|----|------|-----------|----------|
| `laplusOshiCard` | hbp04-005 | Laplus Darkness（推し） | `oshi` | https://card.yuyu-tei.jp/hocg/100_140/hbp04/10011.jpg |
| `laplusHolomenCard` | hbp04-055 | Laplus Darkness（ホロメン） | `backstage` | https://card.yuyu-tei.jp/hocg/100_140/hbp04/10112.jpg |

---

## 3. Step Card（SimulationStepCard）

### 3.1 Phase Indicator（階段標題 + Icon + 步驟計數）

Step Card 頂部為階段指示列，包含三個元素：

```
┌──────────────────────────────────────┐
│ 📣  吶喊階段              步驟 1/1   │
├──────────────────────────────────────┤
│                                      │
│  （步驟內容區域）                     │
│                                      │
├──────────────────────────────────────┤
│          [上一步]    [下一步 →]       │
└──────────────────────────────────────┘
```

| 元素 | 樣式 | 說明 |
|------|------|------|
| Phase Icon | fontSize: 20（桌機）/ 16（手機），marginRight: 8/6 | 來自 `phaseIcon` prop，如 📣、🔄、⚡ |
| Phase Title | color: `COLORS.primary`（粉紅），fontSize: 15/13，fontWeight: 700 | 來自 `phaseTitle` prop，如「吶喊階段」 |
| Step Badge | 背景 `COLORS.surfaceLight`，borderRadius: 12/10，paddingHorizontal: 10/8 | 顯示「步驟 {n}/{total}」文字 |

分隔線：`borderBottomWidth: 1`，`borderBottomColor: COLORS.border`（#2d3748）。

### 3.2 步驟內容（Title, Description, ActionLabel, Explanation）

步驟內容放置在可滾動的 `ScrollView` 中，包含以下區塊：

#### Step Title（步驟標題）
- fontSize: 22（桌機）/ 17（手機）
- color: `COLORS.text`（白色）
- fontWeight: **bold**
- marginBottom: 10 / 8

#### Description（步驟說明）
- fontSize: 15（桌機）/ 13（手機）
- color: `COLORS.textSecondary`（灰白 #a0aec0）
- lineHeight: 24 / 20
- marginBottom: 12 / 10

#### Action Label（動作標籤，選擇性）
- 僅在 `step.actionLabel` 有值時顯示
- 外框：背景 `COLORS.primary + '18'`（粉紅 18% 透明度），邊框 `COLORS.primary + '30'`
- 包含一個 emoji（依 `step.phaseId` 對應）與動作文字
- borderRadius: 12（桌機）/ 10（手機）

| phaseId | Action Emoji |
|---------|-------------|
| `setup` | 🎮 |
| `reset` | 🔄 |
| `draw` | 📚 |
| `cheer` | 📣 |
| `main` | ⚡ |
| `performance` | 🎭 |
| `end` | 🏁 |

#### Explanation（解說提示，選擇性）
- 僅在 `step.explanation` 有值時顯示
- 外框：背景 `COLORS.secondary + '18'`（藍紫 18% 透明度）
- 前方有 💡 圖示
- 文字 color: `COLORS.textSecondary`，fontStyle: **italic**
- fontSize: 13（桌機）/ 12（手機）

### 3.3 導航按鈕（上一步 / 下一步 / 完成模擬）

Step Card 底部固定顯示導航按鈕列：

```
┌──────────────────────────────────────┐
│  ← 上一步             下一步 →       │
│  （灰色）           （粉紅主色）       │
└──────────────────────────────────────┘
```

#### 上一步按鈕（條件式顯示）

```typescript
// 只有在「不是第一步驟或不是第一階段」時才顯示
{!isFirst || !isFirstPhase ? (
  <TouchableOpacity style={prevButtonStyle}>
    <Text>←</Text>
    <Text>上一步</Text>
  </TouchableOpacity>
) : (
  <View style={spacer} />  // 保持 flex 對齊
)}
```

- 背景：`COLORS.surfaceLight`（較暗表面色）
- 文字顏色：`COLORS.textSecondary`（灰白色）
- 左箭頭 `←` +「上一步」文字

#### 下一步 / 完成按鈕（始終顯示）

```tsx
<TouchableOpacity style={nextButtonStyle}>
  <Text>
    {isLast && isLastPhase ? '🎉 完成模擬' : '下一步 →'}
  </Text>
</TouchableOpacity>
```

- 背景：`COLORS.primary`（粉紅 #ff6b9d）
- 文字顏色：白色
- 在**最後階段的最後一步**時，按鈕文字變為「🎉 完成模擬」
- 點擊後觸發 `navigation.goBack()` 返回上頁

---

## 4. Mobile 適配

### 4.1 480px 斷點

```typescript
const MOBILE_BREAKPOINT = 480;
const isMobile = screenWidth < MOBILE_BREAKPOINT;
```

使用 `useWindowDimensions()` 獲取即時螢幕寬度，透過 `isMobile` 布林值控制所有適配邏輯。

### 4.2 Zone 高度

| 屬性 | 桌機版 | 手機版 |
|------|--------|--------|
| Zone 尺寸控制 | `aspectRatio: 1`（強制正方形） | `aspectRatio: undefined`, `height: 50`（固定高度） |
| 結果 | 寬度 = 高度，隨容器自動調整 | 寬度由 flex: 1 分配，高度固定 50px |

### 4.3 ScrollView 高度

| 屬性 | 桌機版 | 手機版 |
|------|--------|--------|
| Step Card 內部 ScrollView | `maxHeight: 280` | `maxHeight: 180` |
| 用途 | 確保步驟內容過長時可內層滾動 | 手機版減少 100px，節省垂直空間 |

### 4.4 Board 最大高度

```typescript
const boardMaxHeight = isMobile
  ? Math.min(screenHeight * 0.28, 200)  // 螢幕高度 28%，最高 200px
  : Math.min(screenHeight * 0.4, 320);  // 螢幕高度 40%，最高 320px
```

| 條件 | 計算方式 | 說明 |
|------|----------|------|
| 桌機版 | `min(screenHeight * 0.4, 320)` | 最多佔 40% 畫面，上限 320px |
| 手機版 | `min(screenHeight * 0.28, 200)` | 最多佔 28% 畫面，上限 200px |

---

## 5. 互動邏輯

### 5.1 Phase / Step 導航邏輯

#### 狀態定義

```typescript
const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
const [currentStepIndex, setCurrentStepIndex] = useState(0);
```

#### 下一步（handleNext）

```typescript
const handleNext = useCallback(() => {
  if (!isLastStep) {
    // 同一階段內：移到下一步驟
    setCurrentStepIndex((prev) => prev + 1);
  } else if (!isLastPhase) {
    // 階段最後一步，但非最後階段：進入下一階段，步驟歸零
    setCurrentPhaseIndex((prev) => prev + 1);
    setCurrentStepIndex(0);
  } else {
    // 最後階段的最後一步：結束模擬，返回上頁
    navigation.goBack();
  }
}, [isLastStep, isLastPhase, navigation]);
```

#### 上一步（handlePrev）

```typescript
const handlePrev = useCallback(() => {
  if (!isFirstStep) {
    // 同一階段內：回到上一步驟
    setCurrentStepIndex((prev) => prev - 1);
  } else if (!isFirstPhase) {
    // 階段第一步，但非第一階段：回到上一階段的最後一步
    setCurrentPhaseIndex((prev) => prev - 1);
    const prevPhase = simulationPhases[currentPhaseIndex - 1];
    setCurrentStepIndex(prevPhase.steps.length - 1);
  }
  // 第一階段的第一步：無操作（上一步按鈕被隱藏）
}, [isFirstStep, isFirstPhase, currentPhaseIndex]);
```

### 5.2 進度條計算方式

```typescript
// 總步驟數 = 所有階段 steps 長度加總
const totalSteps = useMemo(
  () => simulationPhases.reduce((sum, phase) => sum + phase.steps.length, 0),
  []  // 資料靜態，無依賴
);

// 已完成步驟數 = 已完成階段的所有步驟 + 當前階段已完成步驟
const stepsDone = useMemo(
  () => simulationPhases
    .slice(0, currentPhaseIndex)                          // 已完成的階段
    .reduce((sum, phase) => sum + phase.steps.length, 0)  // 加總步驟數
    + currentStepIndex,                                    // 加上當前階段已走步數
  [currentPhaseIndex, currentStepIndex]
);

// 進度百分比（0 ~ 100）
const progressPercent = ((stepsDone) / (totalSteps - 1)) * 100;
```

**範例計算：**

| 情境 | stepsDone | totalSteps | 進度 |
|------|-----------|------------|------|
| 初始（第 1 階段第 1 步） | 0 | 20 | 0% |
| 第 1 階段第 2 步 | 1 | 20 | 5.26% |
| 第 4 階段第 1 步 | 11 | 20 | 57.89% |
| 最後階段最後一步 | 19 | 20 | 100% |

### 5.3 首 / 尾步驟的邊界處理

| 邊界條件 | 上一步按鈕 | 下一步按鈕 | 說明 |
|----------|-----------|-----------|------|
| **第一階段 × 第一步驟** | ❌ 隱藏（`spacer` 佔位） | ✅ 顯示「下一步 →」 | 無上一步路徑 |
| **第一階段 × 非第一步驟** | ✅ 顯示 | ✅ 顯示 | 正常導航 |
| **非第一階段 × 第一步驟** | ✅ 顯示（回到上階段最後一步） | ✅ 顯示 | 跨階段返回 |
| **最後階段 × 最後步驟** | ✅ 顯示 | ✅ 顯示「🎉 完成模擬」 | 結束模擬 |
| **非最後階段 × 最後步驟** | ✅ 顯示 | ✅ 顯示「下一步 →」（進入下階段） | 跨階段前進 |

---

## 6. 資料結構

### 6.1 SimulationPhase（階段）

```typescript
export interface SimulationPhase {
  id: string;        // 唯一識別碼，如 'setup', 'main', 'performance'
  title: string;     // 中文階段名稱，如 '開場準備', '主要階段'
  icon: string;      // Emoji 圖示，如 '🎒', '⚡', '🎭'
  steps: SimulationStep[];  // 步驟陣列
}
```

### 6.2 SimulationStep（步驟）

```typescript
export interface SimulationStep {
  phaseId: SimPhase;          // 所屬階段 ID
  stepNumber: number;         // 步驟編號（從 1 開始）
  title: string;              // 步驟標題
  description: string;        // 步驟說明文字
  highlightZone?: string;     // 要高亮的 Zone ID（選擇性）
  actionLabel?: string;       // 動作標籤文字（選擇性）
  explanation?: string;       // 解說提示文字（選擇性）
  cardRef?: SimulationCardRef; // 關聯卡牌參考（選擇性）
}
```

### 6.3 SimulationCardRef（卡牌參考）

```typescript
export interface SimulationCardRef {
  id: string;         // 卡牌編號，如 'hbp04-005'
  name: string;       // 卡牌名稱
  imageUrl: string;   // 圖片 URL
}
```

### 6.4 7 階段、20 步驟一覽

| # | 階段 ID | 階段名稱 | Icon | 步驟數 | 步驟名稱 |
|---|---------|----------|------|--------|----------|
| 1 | `setup` | 開場準備 | 🎒 | 3 | 選擇主推 → 設置牌組 → 猜拳決定先後攻 |
| 2 | `reset` | 重置階段 | 🔄 | 1 | 回復活動狀態 |
| 3 | `draw` | 抽牌階段 | 📚 | 1 | 抽 1 張牌 |
| 4 | `cheer` | 吶喊階段 | 📣 | 1 | 展示吶喊卡 |
| 5 | `main` | 主要階段 | ⚡ | 6 | 放置成員 → 進行綻放 → 使用支援卡 → 使用主推技能 → 進行聯動 → 交棒 |
| 6 | `performance` | 表演階段 | 🎭 | 3 | 選擇攻擊目標 → 使用藝能 → 確認傷害與擊倒 |
| 7 | `end` | 結束階段 | 🏁 | 1 | 回合結束 |

---

## 7. 依賴組件與路由

### 7.1 組件依賴樹

```
TutorialSimulationScreen
├── SafeAreaView (react-native-safe-area-context)
├── ScrollView
├── SimulationBoard
│   └── ZoneBox (×9，含 Image 或 Text)
└── SimulationStepCard
    ├── ScrollView (內層)
    ├── TouchableOpacity (上一步)
    └── TouchableOpacity (下一步/完成)
```

### 7.2 路由整合

```typescript
// src/navigation/AppNavigator.tsx
// TutorialSimulationScreen 透過以下路由訪問：

export type RootStackParamList = {
  TutorialSimulation: undefined;  // 無需參數
  // ...其他路由
};
```

### 7.3 主題色彩參考

所有顏色常量定義於 `src/constants/index.ts` 的 `COLORS` 物件：

| Token | 色碼 | 用途 |
|-------|------|------|
| `COLORS.primary` | `#ff6b9d` | 主色調（粉紅）：高亮邊框、階段標題、下一步按鈕、動作標籤 |
| `COLORS.secondary` | `#6366f1` | 次要色（藍紫）：解說框背景 |
| `COLORS.background` | `#0f0f23` | 整體背景（深藍黑） |
| `COLORS.surface` | `#1a1a2e` | 卡片/Zone 表面色 |
| `COLORS.surfaceLight` | `#252542` | 較亮表面：進度條軌道、步驟徽章、上一步按鈕 |
| `COLORS.text` | `#ffffff` | 主要文字（白色） |
| `COLORS.textSecondary` | `#a0aec0` | 次要文字（灰白） |
| `COLORS.border` | `#2d3748` | 邊框色 |

---

> **文件結束**
