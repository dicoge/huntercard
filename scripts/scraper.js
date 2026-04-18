/**
 * hololive TCG 卡牌資料爬蟲
 * 從 holotcgtw GitHub Pages 抓取卡牌資料
 */

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// holotcgtw 的 GitHub Pages 靜態資料
const HOLOTCG_API_URL = 'https://tetsunekko.github.io/holotcgtw/data/cards.json';

async function fetchJSON(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HoloHunter/1.0)',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('開始抓取 hololive TCG 卡牌資料...');
  
  // 嘗試從 holotcgtw 抓取資料
  console.log(`\n嘗試從 holotcgtw 抓取: ${HOLOTCG_API_URL}`);
  const cardsData = await fetchJSON(HOLOTCG_API_URL);
  
  if (!cardsData) {
    console.log('無法從 holotcgtw 抓取資料，使用備用資料源');
    // 使用我們現有的資料
    const existingData = JSON.parse(await readFile(
      join(__dirname, '../src/data/hololive-cards.json'),
      'utf-8'
    ));
    
    console.log(`\n使用現有資料: ${existingData.cards.length} 張卡牌`);
    return;
  }
  
  console.log(`成功抓取 ${cardsData.length || Object.keys(cardsData).length} 張卡牌`);
  
  // 轉換為我們的格式
  const transformedCards = (Array.isArray(cardsData) ? cardsData : Object.values(cardsData)).map(card => ({
    id: card.id || card.cardNumber || card.code,
    cardNumber: card.cardNumber || card.code,
    member: card.name_zh || card.name || card.member,
    memberJp: card.name_jp || card.name,
    series: card.series_name_zh || card.series_name || card.series,
    seriesCode: card.series_code || card.expansion,
    rarity: card.rarity || 'C',
    imageUrl: card.image_url || card.image,
    description: card.description_zh || card.description,
    releaseDate: card.release_date,
    category: 'hololive',
    prices: [],
  }));
  
  // 輸出結果
  const output = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    source: 'holotcgtw',
    cards: transformedCards,
  };
  
  const outputFile = join(__dirname, '../src/data/hololive-cards-export.json');
  await writeFile(outputFile, JSON.stringify(output, null, 2), 'utf-8');
  
  console.log(`\n✅ 完成！已儲存到 ${outputFile}`);
  console.log(`總共 ${transformedCards.length} 張卡牌`);
}

main().catch(console.error);
