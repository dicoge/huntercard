/**
 * 從官方 hololive 卡牌網站抓取新系列卡片資料
 * 使用 text view（view=text&sort=cardnum）解析卡片列表
 *
 * 使用方式：
 *   node scripts/scrape-official-cards.js
 *
 * 產出：
 *   data/official/cardList_hBP08.json
 *   data/official/cardList_hWF01.json
 *   data/official/cardList_hCO01.json
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 要抓取的新系列
const SERIES = [
  {
    code: 'hBP08',
    name: 'バウンサーバウンド',
    expected: 121,
    url: 'https://hololive-official-cardgame.com/cardlist/cardsearch/?expansion=hBP08&view=text&sort=cardnum',
  },
  {
    code: 'hWF01',
    name: 'ツインウエハース',
    expected: 34,
    url: 'https://hololive-official-cardgame.com/cardlist/cardsearch/?expansion=hWF01&view=text&sort=cardnum',
  },
  {
    code: 'hCO01',
    name: '2025ライブセット',
    expected: 8,
    url: 'https://hololive-official-cardgame.com/cardlist/cardsearch/?expansion=hCO01&view=text&sort=cardnum',
  },
];

// 顏色對應：type_xxx.png 檔案名 → 英文
const COLOR_MAP = {
  type_white: 'white',
  type_red: 'red',
  type_green: 'green',
  type_blue: 'blue',
  type_purple: 'purple',
  type_yellow: 'yellow',
};

// 類型對應
const TYPE_MAP = {
  'ホロメン': 'Holomen',
  '推しホロメン': 'OshiHolomen',
  'サポート': 'Support',
  'Buzzホロメン': 'BuzzHolomen',
  'エール': 'Yell',
  'LIMITED': 'Limited',
  'サポート・アイテム': 'SupportItem',
  'サポート・イベント': 'SupportEvent',
  'サポート・ツール': 'SupportTool',
  'サポート・マスコット': 'SupportMascot',
  'サポート・ファン': 'SupportFan',
  'サポート・スタッフ': 'SupportStaff',
};

/**
 * 從 img src URL 提取顏色名稱
 * e.g. "/wp-content/images/texticon/type_white.png" → "white"
 */
function extractColor(imgSrc) {
  if (!imgSrc) return 'colorless';
  const match = imgSrc.match(/type_(\w+)\.png/);
  if (match) {
    const key = `type_${match[1]}`;
    return COLOR_MAP[key] || match[1];
  }
  return 'colorless';
}

/**
 * 爬取單一系列
 */
async function scrapeSeries(browser, series) {
  console.log(`\n🔍 抓取系列：${series.code} - ${series.name}`);

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  try {
    await page.goto(series.url, { waitUntil: 'networkidle2', timeout: 60000 });

    // 等待 text view 的卡片列表載入
    await page.waitForSelector('a[href*="/cardlist/?id="]', { timeout: 15000 });

    // 滾動視窗觸發 infinite scroll，載入全部卡片
    // 該頁使用 window scroll event + exload() 函數載入（max_page=9）
    const maxScrollAttempts = 25;
    let prevCount = 0;
    let stableCount = 0;
    for (let i = 0; i < maxScrollAttempts; i++) {
      const curCount = await page.evaluate(() =>
        document.querySelectorAll('a[href*="/cardlist/?id="]').length
      );
      if (curCount > 0 && curCount === prevCount) {
        stableCount++;
        if (stableCount >= 3) break; // 連續 3 次沒變化代表載入完成
      } else {
        stableCount = 0;
      }
      prevCount = curCount;

      // 嘗試三種滾動方式確保觸發 lazy load
      await page.evaluate(() => {
        // 1. scroll window
        window.scrollTo(0, document.body.scrollHeight);
        // 2. scroll .all-wrap 容器
        const wrap = document.querySelector('.all-wrap');
        if (wrap) wrap.scrollTop = wrap.scrollHeight;
        // 3. 直接呼叫 exload（如果可用）
        if (typeof exload === 'function') exload();
      });
      await new Promise((r) => setTimeout(r, 1500));
    }

    // 提取卡片資料
    const cards = await page.evaluate((seriesCode, typeMapJson, colorMapJson) => {
      const TYPE_MAP_LOCAL = JSON.parse(typeMapJson);
      const COLOR_MAP_LOCAL = JSON.parse(colorMapJson);
      const items = document.querySelectorAll('a[href*="/cardlist/?id="]');
      const results = [];

      items.forEach((item) => {
        try {
          // 基本資訊
          const numberEl = item.querySelector('.number');
          const nameEl = item.querySelector('.name');
          if (!numberEl || !nameEl) return;

          const cardNumber = numberEl.textContent.trim();
          const name = nameEl.textContent.trim();

          // 圖片
          const imgEl = item.querySelector('.img img');
          let imageUrl = '';
          let color = 'colorless';
          // 顏色從 dl.info_Detail 內的色 icon img 判斷，不從卡片主圖
          if (imgEl) {
            imageUrl = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
            // 補成完整 URL
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = `https://hololive-official-cardgame.com${imageUrl}`;
            }
          }

          // dt/dd 資訊（カードタイプ、タグ、レアリティ、収録商品）
          const dts = item.querySelectorAll('dl dt');
          const info = {};
          dts.forEach((dt) => {
            const key = dt.textContent.trim();
            const dd = dt.nextElementSibling;
            if (dd && dd.tagName === 'DD') {
              info[key] = dd.textContent.trim();
            }
          });

          // 細部資訊（色、HP、Bloomレベル）
          const detailDts = item.querySelectorAll('dl.info_Detail dt');
          detailDts.forEach((dt) => {
            const key = dt.textContent.trim();
            const dd = dt.nextElementSibling;
            if (dd && dd.tagName === 'DD') {
              // 顏色的 dd 是 img
              if (key === '色') {
                const colorImg = dd.querySelector('img');
                if (colorImg) {
                  color = extractColorLocal(colorImg.getAttribute('src') || '', COLOR_MAP_LOCAL);
                }
              } else {
                info[key] = dd.textContent.trim();
              }
            }
          });

          // 類型
          const cardTypeJp = info['カードタイプ'] || '';
          const cardType = TYPE_MAP_LOCAL[cardTypeJp] || cardTypeJp;

          // 稀有度
          const rarity = info['レアリティ'] || '';

          // HP（只有ホロメン才有）
          const hp = info['HP'] || '';

          results.push({
            cardNumber,
            name,
            cardType,
            color,
            rarity,
            expansion: seriesCode,
            series: seriesCode,
            imageUrl,
            hp,
          });
        } catch (err) {
          // 跳過格式異常的項目
        }
      });

      return results;

      // 內嵌顏色提取函數（從 type_white.png 等提取）
      function extractColorLocal(src, map) {
        if (!src) return 'colorless';
        const m = src.match(/type_(\w+)\.png/);
        if (m) {
          const key = 'type_' + m[1];
          return map[key] || m[1];
        }
        return 'colorless';
      }
    }, series.code, JSON.stringify(TYPE_MAP), JSON.stringify(COLOR_MAP));

    console.log(`  ✅ 找到 ${cards.length} 張卡牌${series.expected ? ` (預期 ${series.expected})` : ''}`);
    return cards;
  } catch (error) {
    console.error(`  ❌ 抓取失敗：${error.message}`);
    return [];
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('🚀 開始抓取 hololive 官方新系列卡牌資料...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const outputDir = path.join(__dirname, '..', 'data', 'official');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const allCards = [];

  for (const series of SERIES) {
    const cards = await scrapeSeries(browser, series);
    allCards.push(...cards);

    // 儲存該系列的 JSON
    const filename = `cardList_${series.code}.json`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(cards, null, 2), 'utf-8');
    console.log(`  💾 已儲存：${filename} (${cards.length} 張)`);

    // 禮貌性延遲 2-3 秒
    if (series !== SERIES[SERIES.length - 1]) {
      const delay = 2000 + Math.random() * 1000;
      console.log(`  ⏳ 等待 ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  await browser.close();

  console.log(`\n📊 總共抓取：${allCards.length} 張卡牌`);
  console.log('✅ 全部完成！');
}

main().catch((err) => {
  console.error('❌ 執行失敗：', err);
  process.exit(1);
});