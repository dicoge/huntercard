# CI/CD 流程評估與優化建議

## 專案概覽

- **專案名稱**: hunterCard - Hololive 卡牌價格查詢 app
- **部署平台**: Vercel
- **技術棧**: Expo (React Native Web), TypeScript, Puppeteer

---

## 1. 現有 Build/Deploy 流程分析

### 目前配置

#### 1.1 GitHub Actions - 價格抓取 workflow
**檔案**: `.github/workflows/scrape-yuyu-prices.yml`

```yaml
- 觸發時機: 每天 UTC 20:00 + 手動觸發
- 執行環境: ubuntu-latest
- Node.js 版本: 20
- 主要任務: 抓取並更新 yuyu-prices 數據
```

#### 1.2 Vercel 部署配置
**檔案**: `vercel.json`

```json
- Build Command: expo export --platform web && node scripts/fix-html.js
- Output Directory: dist
- Crons: 每天 02:00 UTC 調用 /api/cron/update-db
```

### 現有流程問題

| 項目 | 現狀 | 問題 |
|------|------|------|
| Pull Request 檢查 | ❌ 無 | PR 無法驗證程式碼正確性 |
| 自動化測試 | ❌ 無 | 無法確保程式碼品質 |
| 依賴快取 | ❌ 無 | 每次都重新下載 node_modules |
| 錯誤通知 | ❌ 無 | 失敗時無法及時得知 |
| 部署狀態 | ❌ 無 | 無自動化部署到 Vercel |

---

## 2. 優化建議

### 2.1 建立 PR 驗證 workflow

**新建檔案**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npx tsc --noEmit
      
      # TODO: 新增測試後啟用
      # - name: Run tests
      #   run: npm test

  build-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build web
        run: npm run build
```

**預期效益**:
- PR 自動執行 TypeScript 類型檢查
- 提前發現型別錯誤
- 阻塞有問題的 PR 合併

### 2.2 新增自動化測試

**安裝測試框架**:
```bash
npm install --save-dev vitest @testing-library/react-native
```

**配置 `vitest.config.ts`**:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

**新增測試範例** (`src/utils/price.test.ts`):
```typescript
import { describe, it, expect } from 'vitest';

describe('Price Utility', () => {
  it('should format price correctly', () => {
    expect(formatPrice(1000)).toBe('NT$1,000');
  });
  
  it('should handle missing prices', () => {
    expect(formatPrice(null)).toBe('N/A');
  });
});
```

### 2.3 建立自動化部署 workflow

**新建檔案**: `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

**需要的 Secret**:
- `VERCEL_TOKEN`: Vercel 個人訪問令牌
- `VERCEL_ORG_ID`: Vercel 組織 ID
- `VERCEL_PROJECT_ID`: Vercel 專案 ID

### 2.4 改進現有 scraper workflow

**優化 `.github/workflows/scrape-yuyu-prices.yml`**:

```yaml
name: Scrape Yuyu Prices

on:
  schedule:
    - cron: '0 20 * * *'
  workflow_dispatch:

jobs:
  scrape-prices:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: scripts/package-lock.json
      
      - name: Install dependencies
        working-directory: scripts
        run: npm ci
      
      - name: Cache Puppeteer
        uses: actions/cache@v4
        with:
          path: ~/.cache/puppeteer
          key: ${{ runner.os }}-puppeteer-${{ hashFiles('scripts/package-lock.json') }}
      
      - name: Install Puppeteer dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y ...
      
      - name: Run scraper
        working-directory: scripts
        run: PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true node scrape-yuyu-prices.js
      
      - name: Commit and push
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add data/yuyu-prices/
          git diff --staged --quiet || git commit -m "chore: update yuyu-tei prices $(date +%Y-%m-%d)"
          git push origin main
      
      # 新增: 部署更新後的數據
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### 2.5 新增錯誤通知

**使用 GitHub Actions 内建失敗通知**:

```yaml
- name: Notify on Failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    fields: repo,message,commit,author
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 3. 自動化測試整合

### 測試策略建議

| 測試類型 | 工具 | 優先級 |
|---------|------|--------|
| 單元測試 | Vitest | 🔴 高 |
| API 測試 | Supertest | 🟡 中 |
| E2E 測試 | Playwright | 🟢 低 |

### 測試覆蓋建議

```typescript
// src/utils/format.test.ts
describe('formatPrice', () => {
  it('should format TWD currency', () => {
    expect(formatPrice(1500, 'TWD')).toBe('NT$1,500');
  });
});

// src/utils/search.test.ts
describe('searchCards', () => {
  it('should find cards by name', () => {
    const results = searchCards('holo', allCards);
    expect(results.length).toBeGreaterThan(0);
  });
});
```

---

## 4. 發布流程改進

### 建議的發布流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Feature   │ ──▶ │     PR      │ ──▶ │   Merge     │ ──▶ │  Production │
│   Branch    │     │  + CI/CD    │     │   to main   │     │  Auto Deploy│
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                        │                                        │
                        ▼                                        ▼
                   ┌─────────────┐                         ┌─────────────┐
                   │ Type Check  │                         │  Deploy to  │
                   │ Unit Tests  │                         │   Vercel    │
                   │ Build Check │                         └─────────────┘
                   └─────────────┘
```

### 版本號管理

**使用 GitHub Releases**:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: npm run build
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 5. 優先級排序

| 優先級 | 項目 | 預期效益 |
|--------|------|----------|
| 🔴 高 | CI workflow | PR 品質把關 |
| 🔴 高 | 依賴快取 | 加速 CI 執行 |
| 🟡 中 | 單元測試 | 程式碼品質 |
| 🟡 中 | 自動部署 | 加速發布 |
| 🟢 低 | Slack 通知 | 及時得知錯誤 |

---

## 總結

目前專案僅有定時的價格抓取 workflow，缺乏完整的 CI/CD 流程。建議按優先順序實作：

1. **立即**: 建立 CI workflow 攔截有問題的 PR
2. **短期**: 加入測試框架和單元測試
3. **中期**: 建立自動部署到 Vercel
4. **長期**: 完善通知機制和發布流程

---
*Generated: 2026-05-02*