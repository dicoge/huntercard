/**
 * build-database.js — 統合爬蟲 + 圖片下載 + 資料庫產出
 * 
 * 流程：
 * 1. 用 Puppeteer 爬 yuyu-tei 價格 + 圖片 URL
 * 2. 下載新卡片圖片到 data/images/
 * 3. 讀取 data/official/*.json 合併基本資料
 * 4. 產出 data/database.json
 * 5. 安全檢查：totalCards < 50 就拋錯
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://yuyu-tei.jp';
const SCRIPT_DIR = __dirname;
const PROJECT_DIR = path.resolve(SCRIPT_DIR, '..');
const DATA_DIR = path.join(PROJECT_DIR, 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const OFFICIAL_DIR = path.join(DATA_DIR, 'official');
const OUTPUT_PATH = path.join(DATA_DIR, 'database.json');
const YUYU_IMAGE_BASE = 'https://card.yuyu-tei.jp/hocg/100_140';

// Series URLs - same as scrape-yuyu-prices.js
const SERIES_PAGES = [
  { name: 'hBP04', url: '/sell/hocg/s/hbp04' },
  ...['hBP01','hBP02','hBP03','hBP05','hBP06','hBP07',
      'hSD01','hSD02','hSD03','hSD04','hSD05','hSD06','hSD07',
      'hSD08','hSD09','hSD10','hSD11','hSD12','hSD13','hSD14',
      'hSD15','hSD16','hSD17','hSD18','hSD19'].map(s => ({
    name: s,
    url: `/sell/hocg/s/search?search_word=&vers[]=${s.toLowerCase()}`,
  })),
  { name: 'hPR', url: '/sell/hocg/s/special/1' },
  { name: 'hY', url: '/sell/hocg/s/special/2' },
  { name: 'ent07', url: '/sell/hocg/s/special/4' },
  { name: 'hCS01', url: '/sell/hocg/s/special/5' },
  { name: 'hPC01', url: '/sell/hocg/s/special/7' },
  { name: 'hSD2025summer', url: '/sell/hocg/s/special/8' },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 下載單張圖片到 data/images/{cardNumber}.jpg
 * 增量：已存在就跳過
 */
async function downloadImage(url, destPath) {
  if (fs.existsSync(destPath)) {
    return false; // 已存在，跳過
  }
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        resolve(downloadImage(response.headers.location, destPath));
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true); // 新下載
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

/**
 * 從 yuyu-tei 爬價格和圖片
 */
async function scrapeYuyuPrices(page) {
  console.log('[database] Starting yuyu-tei scrape...');

  const allPrices = {};
  let totalCards = 0;
  let seriesWithPrices = 0;

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  for (const seriesInfo of SERIES_PAGES) {
    console.log(`[database] Scraping ${seriesInfo.name}: ${seriesInfo.url}`);

    const url = BASE_URL + seriesInfo.url;

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(1500);

      const seriesPrices = await page.evaluate(() => {
        const results = {};
        const productCards = document.querySelectorAll('.card-product');

        productCards.forEach(card => {
          const text = card.textContent?.trim() || '';

          // Extract card number
          const numMatch = text.match(/(h[A-Z]{1,3}\d+-\d{2,3})/i);
          if (!numMatch) return;
          const cardNum = numMatch[1];

          // Extract price
          const priceMatch = text.match(/([\d,]+)\s*円/);
          if (!priceMatch) return;
          const price = parseInt(priceMatch[1].replace(/,/g, ''));
          if (isNaN(price) || price <= 0) return;

          // Extract card name
          const lines = text.split('\n').map(l => l.trim()).filter(l => l);
          let name = '';
          const numIdx = lines.findIndex(l => l.match(/h[A-Z]{1,3}\d+-\d{2,3}/i));
          if (numIdx >= 0 && numIdx + 1 < lines.length) {
            for (let i = numIdx + 1; i < lines.length; i++) {
              if (!lines[i].match(/[\d,]+\s*円/) && !lines[i].includes('在庫') && !lines[i].includes('カート')) {
                name = lines[i];
                break;
              }
            }
          }

          // Extract image URL - the second img is the card image
          const imgs = card.querySelectorAll('img');
          let imageUrl = '';
          for (const img of imgs) {
            if (img.src && img.src.includes('card.yuyu-tei.jp')) {
              imageUrl = img.src;
              break;
            }
          }

          // Also get version/cid for backup URL
          const ver = card.querySelector('.cart_ver');
          const cid = card.querySelector('.cart_cid');
          const version = ver ? ver.value : '';
          const cardId = cid ? cid.value : '';

          results[cardNum] = {
            sellPrice: price,
            name: name,
            yuyuImage: imageUrl || (version && cardId ? `https://card.yuyu-tei.jp/hocg/100_140/${version}/${cardId}.jpg` : ''),
            imageVersion: version,
            imageCid: cardId,
            timestamp: new Date().toISOString(),
          };
        });

        return results;
      });

      const count = Object.keys(seriesPrices).length;
      console.log(`  → Found ${count} cards with prices`);
      if (count > 0) seriesWithPrices++;
      totalCards += count;
      Object.assign(allPrices, seriesPrices);

      await sleep(2000 + Math.random() * 1000);
    } catch (err) {
      console.error(`  → Error: ${err.message}`);
    }
  }

  return { prices: allPrices, totalCards, seriesWithPrices };
}

/**
 * 下載所有新卡片的圖片
 * 回傳 { downloaded: 新下載數量, skipped: 已存在數量 }
 */
async function downloadAllImages(prices) {
  console.log('\n[database] Downloading images...');
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  let downloaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const [cardNum, data] of Object.entries(prices)) {
    if (!data.yuyuImage) {
      errors++;
      continue;
    }

    const destPath = path.join(IMAGES_DIR, `${cardNum}.jpg`);

    try {
      if (fs.existsSync(destPath)) {
        skipped++;
        continue;
      }
      const result = await downloadImage(data.yuyuImage, destPath);
      if (result) {
        downloaded++;
        if (downloaded % 50 === 0) {
          console.log(`  [images] Downloaded ${downloaded} so far...`);
        }
      }
    } catch (err) {
      errors++;
      if (errors <= 5) {
        console.error(`  [images] Failed ${cardNum}: ${err.message}`);
      }
    }
  }

  console.log(`  [images] Downloaded: ${downloaded}, Skipped: ${skipped}, Errors: ${errors}`);
  return { downloaded, skipped, errors };
}

/**
 * 讀取官方資料統合
 */
function loadOfficialData() {
  console.log('\n[database] Loading official card data...');
  const officialCards = {};

  if (!fs.existsSync(OFFICIAL_DIR)) {
    console.log('  [official] No official data directory found');
    return officialCards;
  }

  const files = fs.readdirSync(OFFICIAL_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(OFFICIAL_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const cards = JSON.parse(content);
      if (Array.isArray(cards)) {
        for (const card of cards) {
          const id = card.cardNumber || card.id || '';
          if (id) {
            officialCards[id] = {
              name: card.name || '',
              type: card.cardType || card.type || '',
              color: card.color || '',
              rarity: card.rarity || '',
              series: card.expansion || card.series || '',
              officialImage: card.imageUrl || '',
              hp: card.hp || '',
              life: card.life || '',
              arts: card.arts || '',
            };
          }
        }
      }
    } catch (err) {
      console.error(`  [official] Error reading ${file}: ${err.message}`);
    }
  }

  console.log(`  [official] Loaded ${Object.keys(officialCards).length} cards from ${files.length} files`);
  return officialCards;
}

/**
 * 主流程
 */
async function buildDatabase() {
  const startTime = Date.now();
  console.log('═══════════════════════════════════════');
  console.log('  hunterCard Database Builder');
  console.log('═══════════════════════════════════════\n');

  // Ensure directories
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

  // Step 1: Scrape yuyu-tei
  console.log('── Step 1: Scrape yuyu-tei ──');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log(`  [browser] ${msg.text()}`));
  page.on('pageerror', err => console.error(`  [browser-error] ${err.message}`));

  let yuyuResult;
  try {
    yuyuResult = await scrapeYuyuPrices(page);
  } finally {
    await browser.close();
  }

  const { prices, totalCards, seriesWithPrices } = yuyuResult;
  console.log(`\n  Total cards from yuyu-tei: ${totalCards}`);

  // Safety check
  if (totalCards < 50) {
    throw new Error(` SAFETY CHECK FAILED: totalCards=${totalCards} < 50. Scraper likely failed.`);
  }

  // Step 2: Download images
  console.log('\n── Step 2: Download images ──');
  const dlResult = await downloadAllImages(prices);

  // Step 3: Load official data
  console.log('\n── Step 3: Merge official data ──');
  const officialCards = loadOfficialData();

  // Step 4: Build unified database
  console.log('\n── Step 4: Build unified database ──');
  const database = {
    lastUpdated: new Date().toISOString(),
    totalCards: totalCards,
    source: 'hunterCard unified database',
    cards: {},
  };

  for (const [cardNum, priceData] of Object.entries(prices)) {
    const official = officialCards[cardNum] || {};
    database.cards[cardNum] = {
      id: cardNum,
      name: official.name || priceData.name || '',
      type: official.type || '',
      color: official.color || '',
      rarity: official.rarity || '',
      series: official.series || '',
      sellPrice: priceData.sellPrice || null,
      yuyuName: priceData.name || '',
      yuyuImage: priceData.yuyuImage || '',
      officialImage: official.officialImage || '',
      localImage: fs.existsSync(path.join(IMAGES_DIR, `${cardNum}.jpg`)) ? `/images/${cardNum}.jpg` : '',
      hp: official.hp || '',
      life: official.life || '',
      arts: official.arts || '',
      timestamp: priceData.timestamp || new Date().toISOString(),
    };
  }

  // Also add official cards that have no yuyu-tei price
  for (const [cardNum, official] of Object.entries(officialCards)) {
    if (!database.cards[cardNum]) {
      database.cards[cardNum] = {
        id: cardNum,
        name: official.name || '',
        type: official.type || '',
        color: official.color || '',
        rarity: official.rarity || '',
        series: official.series || '',
        sellPrice: null,
        yuyuName: '',
        yuyuImage: '',
        officialImage: official.officialImage || '',
        localImage: '',
        hp: official.hp || '',
        life: official.life || '',
        arts: official.arts || '',
        timestamp: '',
      };
      database.totalCards++;
    }
  }

  // Fix totalCards to reflect actual unique cards
  database.totalCards = Object.keys(database.cards).length;

  // Write database.json
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(database, null, 2, 'utf-8'));

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n═══════════════════════════════════════`);
  console.log(`  ✅ Build complete!`);
  console.log(`  Total cards: ${database.totalCards}`);
  console.log(`  Cards with prices: ${Object.keys(prices).length}`);
  console.log(`  Images downloaded: ${dlResult.downloaded}`);
  console.log(`  Duration: ${duration}s`);
  console.log(`  Output: ${OUTPUT_PATH}`);
  console.log(`═══════════════════════════════════════`);

  return {
    totalCards: database.totalCards,
    yuyuCount: Object.keys(prices).length,
    officialCount: Object.keys(officialCards).length,
    imagesDownloaded: dlResult.downloaded,
    duration: parseFloat(duration),
  };
}

// Run if called directly
if (process.argv[1]?.includes('build-database')) {
  buildDatabase()
    .then(result => {
      console.log('\nBuild result:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Build failed:', err.message);
      process.exit(1);
    });
}

export { buildDatabase };