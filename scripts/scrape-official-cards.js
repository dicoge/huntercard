/**
 * 從官方 hololive 卡牌網站抓取資料
 * 產生 JSON 檔案供 card-hunter 使用
 * 
 * 使用方式：
 * 1. npm install puppeteer
 * 2. node scripts/scrape-official-cards.js
 * 3. git add data/official-cards/
 * 4. git commit && git push
 * 
 * 作者：dicoge
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 要抓取的系列
const SERIES = [
  { code: 'hBP04', name: 'キュリアスユニバース' },
  { code: 'hBP05', name: 'エンチャントレガリア' },
  { code: 'hBP06', name: 'アヤカシヴァーミリオン' },
  { code: 'hBP07', name: 'ディーヴァフィーバー' },
];

// 顏色對映（日文 → 英文）
const COLOR_MAP = {
  '白': 'white',
  '緑': 'green',
  '赤': 'red',
  '青': 'blue',
  '紫': 'purple',
  '黄': 'yellow',
  '無': 'colorless',
};

// 類型對映
const TYPE_MAP = {
  '推し': 'Oshi',
  'メンバー': 'Member',
  'サポート': 'Support',
  'エナジー': 'Energy',
  'バズ': 'Buzz',
};

// 等級對映
const GRADE_MAP = {
  'debut': 'C',
  '1st': 'U',
  '2nd': 'R',
  'buzz': 'SR',
  'spot': 'N',
};

async function scrapeSeries(browser, series) {
  console.log(`\n🔍 抓取系列：${series.code} - ${series.name}`);
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    const url = `https://hololive-official-cardgame.com/cardlist/cardsearch/?expansion=${series.code}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // 等待卡片列表載入
    await page.waitForSelector('.cardlist-List_Item', { timeout: 10000 }).catch(() => {
      console.log(`  ⚠️ 找不到卡片`);
    });
    
    // 提取卡片資料
    const cards = await page.evaluate(() => {
      const items = document.querySelectorAll('.cardlist-List_Item');
      const results = [];
      
      items.forEach(item => {
        try {
          const numEl = item.querySelector('.cardlist-List_Item_Num');
          const nameEl = item.querySelector('.cardlist-List_Item_Name');
          const typeEl = item.querySelector('.cardlist-List_Item_Kind');
          const colorEl = item.querySelector('.cardlist-List_Item_Color');
          const gradeEl = item.querySelector('.cardlist-List_Item_Grade');
          const imgEl = item.querySelector('img');
          
          results.push({
            id: numEl ? numEl.textContent.trim() : '',
            name: nameEl ? nameEl.textContent.trim() : '',
            typeText: typeEl ? typeEl.textContent.trim() : '',
            colorText: colorEl ? colorEl.textContent.trim() : '',
            gradeText: gradeEl ? gradeEl.textContent.trim().toLowerCase() : '',
            imageUrl: imgEl ? (imgEl.src || imgEl.dataset.src || '') : '',
          });
        } catch (err) {
          // 跳過格式錯誤的項目
        }
      });
      
      return results;
    });
    
    // 處理並轉換資料
    const processedCards = cards.map(card => {
      // 判斷類型
      let type = 'Member';
      for (const [jp, en] of Object.entries(TYPE_MAP)) {
        if (card.typeText.includes(jp)) {
          type = en;
          break;
        }
      }
      
      // 判斷顏色
      let color = 'colorless';
      for (const [jp, en] of Object.entries(COLOR_MAP)) {
        if (card.colorText.includes(jp)) {
          color = en;
          break;
        }
      }
      
      // 判斷等級
      let grade = 'debut';
      if (card.gradeText.includes('1st')) grade = '1st';
      else if (card.gradeText.includes('2nd')) grade = '2nd';
      else if (card.gradeText.includes('buzz')) grade = 'buzz';
      
      // 從圖片 URL 提取資料夾
      const imgMatch = card.imageUrl.match(/\/([^\/]+\/)\w/);
      const imageFolder = imgMatch ? imgMatch[1] : `${series.code}/`;
      
      return {
        id: card.id,
        name: card.name,
        type,
        grade,
        rarity: GRADE_MAP[grade] || 'C',
        color: [color],
        series: [series.code],
        imageUrl: card.imageUrl,
        searchKeywords: [card.name],
        versions: [],
        tags: [],
        imageFolder,
      };
    }).filter(card => card.id);
    
    console.log(`  ✅ 找到 ${processedCards.length} 張卡牌`);
    return processedCards;
    
  } catch (error) {
    console.error(`  ❌ 抓取失敗：${error.message}`);
    return [];
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('🚀 開始抓取 hololive 官方卡牌資料...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const allCards = [];
  
  for (const series of SERIES) {
    const cards = await scrapeSeries(browser, series);
    allCards.push(...cards);
    
    // 禮貌性延遲，避免對伺服器造成負擔
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  await browser.close();
  
  console.log(`\n📊 總共抓取：${allCards.length} 張卡牌`);
  
  // 依系列分組
  const cardsBySeries = {};
  for (const card of allCards) {
    const series = card.series[0];
    if (!cardsBySeries[series]) {
      cardsBySeries[series] = [];
    }
    cardsBySeries[series].push(card);
  }
  
  // 儲存 JSON 檔案
  const outputDir = path.join(__dirname, '../data/official');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  for (const [series, cards] of Object.entries(cardsBySeries)) {
    const filename = `cardList_${series}.json`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(cards, null, 2), 'utf-8');
    console.log(`💾 已儲存：${filename} (${cards.length} 張)`);
  }
  
  // 儲存合併檔案
  const combinedFile = path.join(outputDir, 'all-new-cards.json');
  fs.writeFileSync(combinedFile, JSON.stringify(allCards, null, 2), 'utf-8');
  console.log(`💾 已儲存：all-new-cards.json`);
  
  console.log('\n✅ 抓取完成！');
  console.log(`📂 資料夾位置：${outputDir}`);
  console.log('\n下一步：');
  console.log('  git add data/official/');
  console.log('  git commit -m "feat: add official card data for hBP04-hBP07"');
  console.log('  git push');
}

main().catch(console.error);
