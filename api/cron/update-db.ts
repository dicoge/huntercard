import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import { load } from 'cheerio';

// 設定為 Node.js runtime（爬蟲需要 DOM 解析）
export const config = {
  runtime: 'nodejs',
};

// 來源網站設定
const SOURCES = {
  yuyutei: {
    name: '遊々亭',
    baseUrl: 'https://yuyu-tei.jp/top/hocg/',
    searchUrl: (cardNumber: string) => `https://yuyu-tei.jp/top/hocg/?s=${encodeURIComponent(cardNumber)}`,
  },
  carousell: {
    name: 'Carousell',
    baseUrl: 'https://www.carousell.com.tw',
    searchUrl: (cardNumber: string) => `https://www.carousell.com.tw/search/?q=${encodeURIComponent(cardNumber)}`,
  },
};

interface PriceInfo {
  source: string;
  price: number;
  currency: string;
  url: string;
  inStock: boolean;
  lastUpdated: string;
}

interface ScrapedCard {
  id: string;
  cardNumber: string;
  member: string;
  memberJp: string;
  series: string;
  rarity: string;
  imageUrl?: string;
  description?: string;
  prices: PriceInfo[];
  lastScraped: string;
}

interface ScrapeLog {
  success: number;
  failure: number;
  startTime: string;
  endTime: string;
  errors: string[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 驗證 Cron Job 來源（Vercel 會自動添加 auth header）
  const authHeader = req.headers.authorization;
  if (req.headers['x-vercel-cron'] !== '1') {
    return res.status(401).json({ error: 'Unauthorized: Only Vercel Cron can trigger this endpoint' });
  }

  const startTime = new Date().toISOString();
  const log: ScrapeLog = {
    success: 0,
    failure: 0,
    startTime,
    endTime: '',
    errors: [],
  };

  try {
    // 1. 從 holotcgtw 獲取所有卡號
    console.log('🔍 開始獲取卡牌列表...');
    const cardNumbers = await getAllCardNumbers();
    console.log(`📋 找到 ${cardNumbers.length} 張卡牌`);

    // 2. 依序爬蟲每張卡牌的價格（為了避免被擋，加了延遲）
    let cardData = {} as Record<string, ScrapedCard>;

    // 先從 KV 讀取現有資料
    console.log('📖 讀取現有資料庫...');
    const existingData = await kv.get<Record<string, ScrapedCard>>('hologtc_cards');
    cardData = existingData || {};

    // 3. 爬蟲遊々亭價格
    console.log('🏯 開始爬蟲遊々亭價格...');
    for (const cardNumber of cardNumbers) {
      try {
        const price = await scrapeYuyuTei(cardNumber);
        
        // 更新卡牌資料
        if (!cardData[cardNumber]) {
          cardData[cardNumber] = {
            id: cardNumber,
            cardNumber,
            member: extractMemberName(cardNumber),
            memberJp: '',
            series: extractSeries(cardNumber),
            rarity: extractRarity(cardNumber),
            prices: [],
            lastScraped: new Date().toISOString(),
          };
        }

        if (price) {
          // 更新或添加價格
          const existingIndex = cardData[cardNumber].prices.findIndex(p => p.source === '遊々亭');
          if (existingIndex >= 0) {
            cardData[cardNumber].prices[existingIndex] = price;
          } else {
            cardData[cardNumber].prices.push(price);
          }
          cardData[cardNumber].lastScraped = new Date().toISOString();
          log.success++;
        } else {
          log.failure++;
          log.errors.push(`遊々亭: ${cardNumber} 沒有找到價格`);
        }

        // 延遲避免被擋
        await sleep(500);
      } catch (error) {
        log.failure++;
        log.errors.push(`遊々亭: ${cardNumber} 爬蟲失敗: ${error}`);
        console.error(`❌ 遊々亭 ${cardNumber} 失敗:`, error);
      }
    }

    // 4. 爬蟲 Carousell 價格
    console.log('🔄 開始爬蟲 Carousell 價格...');
    for (const cardNumber of cardNumbers) {
      try {
        const price = await scrapeCarousell(cardNumber);
        
        if (price) {
          // 更新或添加價格
          const existingIndex = cardData[cardNumber].prices.findIndex(p => p.source === 'Carousell');
          if (existingIndex >= 0) {
            cardData[cardNumber].prices[existingIndex] = price;
          } else {
            cardData[cardNumber].prices.push(price);
          }
          cardData[cardNumber].lastScraped = new Date().toISOString();
          log.success++;
        } else {
          log.failure++;
          log.errors.push(`Carousell: ${cardNumber} 沒有找到價格`);
        }

        await sleep(500);
      } catch (error) {
        log.failure++;
        log.errors.push(`Carousell: ${cardNumber} 爬蟲失敗: ${error}`);
        console.error(`❌ Carousell ${cardNumber} 失敗:`, error);
      }
    }

    // 5. 儲存到 Vercel KV
    console.log('💾 儲存到資料庫...');
    await kv.set('hologtc_cards', cardData);
    await kv.set('hologtc_last_update', new Date().toISOString());
    await kv.set('hologtc_scrape_log', { ...log, endTime: new Date().toISOString() });

    log.endTime = new Date().toISOString();

    console.log('✅ 爬蟲完成！');
    return res.status(200).json({
      message: 'Database updated successfully',
      log,
      totalCards: cardNumbers.length,
    });

  } catch (error) {
    console.error('❌ 爬蟲失敗:', error);
    const endTime = new Date().toISOString();
    return res.status(500).json({
      error: 'Scraping failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      log: { ...log, endTime, errors: [...log.errors, String(error)] },
    });
  }
}

// ─── 工具函數 ─────────────────────────────────────────────

async function getAllCardNumbers(): Promise<string[]> {
  // 從 holotcgtw 獲取所有卡號
  const seriesPrefixes = ['hBP01', 'hBP02', 'hBP03', 'hSD01', 'hSD02', 'hSD03', 'hSD04', 'hSD05', 'hSD06', 'hSD07', 'hPR'];
  const cardNumbers: string[] = [];

  const baseUrl = 'https://raw.githubusercontent.com/TETSUNekko/holotcgtw/main/client/src/cardList_';

  for (const prefix of seriesPrefixes) {
    try {
      const response = await fetch(`${baseUrl}${prefix}.json`);
      if (response.ok) {
        const cards = await response.json();
        if (Array.isArray(cards)) {
          const ids = cards.map((c: any) => c.id);
          cardNumbers.push(...ids);
        }
      }
    } catch (error) {
      console.error(`⚠️ 無法獲取 ${prefix} 系列:`, error);
    }
  }

  return [...new Set(cardNumbers)]; // 去重
}

async function scrapeYuyuTei(cardNumber: string): Promise<PriceInfo | null> {
  try {
    const searchUrl = `https://yuyu-tei.jp/top/hocg/?s=${encodeURIComponent(cardNumber)}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HoloHunter/1.0; +https://card-hunter-mu.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const $ = load(html);

    // 嘗試找到價格
    let price = 0;
    let inStock = true;

    // 遊々亭價格格式：¥1,234
    $('.price, .amount, .selling-price').each((i, elem) => {
      const priceText = $(elem).text().trim();
      const match = priceText.match(/¥([0-9,]+)/);
      if (match) {
        price = parseInt(match[1].replace(/,/g, ''));
      }
    });

    // 如果沒有找到，嘗試從 product 連結提取
    if (price === 0) {
      $('a[href*="/sr/sr_"]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href && (price === 0 || href === 0)) {
          const priceMatch = href.match(/sr_.*_¥?([0-9]+)/i);
          if (priceMatch) {
            price = parseInt(priceMatch[1]);
          }
        }
      });
    }

    // 檢查庫存
    if ($('.sold-out, .out-of-stock, 在庫なし, 売り切れ').length > 0) {
      inStock = false;
    }

    if (price === 0) {
      // 如果還是找不到價格，檢查是否有其他資訊
      const productLinks = $('a[href*="/sr/sr_hB"], a[href*="/sr/sr_hS"], a[href*="/sr/sr_hP"]').map((i, elem) => {
        return $(elem).attr('href');
      }).toArray();

      if (productLinks.length === 0) {
        return null;
      }

      // 有 product 但找不到價格（可能是特殊格式）
      // 返回基本資訊，價格為 0
      return {
        source: '遊々亭',
        price: 0,
        currency: 'TWD',
        url: searchUrl,
        inStock,
        lastUpdated: new Date().toISOString(),
      };
    }

    return {
      source: '遊々亭',
      price,
      currency: 'TWD',
      url: searchUrl,
      inStock,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('遊々亭爬蟲錯誤:', error);
    return null;
  }
}

async function scrapeCarousell(cardNumber: string): Promise<PriceInfo | null> {
  try {
    const searchUrl = `https://www.carousell.com.tw/search/?q=${encodeURIComponent(cardNumber)}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HoloHunter/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const $ = load(html);

    // 嘗試找到價格
    let price = 0;
    let inStock = true;

    // Carousell 價格格式：NT$1,234
    $('.price, .amount, .listing-price').each((i, elem) => {
      const priceText = $(elem).text().trim();
      const match = priceText.match(/NT\$([0-9,]+)/i);
      if (match) {
        price = parseInt(match[1].replace(/,/g, ''));
      }
    });

    // 如果沒有找到價格，檢查是否有 listing
    const listings = $('a[href*="/p/"]').length;
    if (listings === 0 && price === 0) {
      return null; // 沒有搜尋結果
    }

    return {
      source: 'Carousell',
      price: price > 0 ? price : 0,
      currency: 'TWD',
      url: searchUrl,
      inStock: listings > 0,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Carousell爬蟲錯誤:', error);
    return null;
  }
}

function extractMemberName(cardNumber: string): string {
  // 從卡號推斷成員名稱（臨時方案，後續可從官方網站爬蟲）
  const memberMap: Record<string, string> = {
    '001': '天音かなた',
    '002': '七詩ムメイ',
    '003': '亞綺·羅森塔爾',
    '004': '兔田佩可拉',
    '005': '鷹嶺ルイ',
    '006': '小鳥遊キアラ',
    '007': '星街すいせい',
    '008': 'こぼ・かなえる',
    // ... 可以擴充更多
  };

  const num = cardNumber.split('-')[1];
  return memberMap[num] || '未知成員';
}

function extractSeries(cardNumber: string): string {
  const seriesMap: Record<string, string> = {
    'hBP01': 'ブルーミングレディアンス',
    'hBP02': 'クインテットスペクトラム',
    'hBP03': 'サバイバル・オブ・ザ・フェイビアス',
    'hSD01': 'スタートデッキ ときのそら',
    'hSD02': 'スタートデッキ 白上フブキ',
    'hSD03': 'スタートデッキ 湊あくあ',
    'hSD04': 'スタートデッキ 天音かなた',
    'hSD05': 'スタートデッキ ReGLOSS',
    'hSD06': 'スタートデッキ 風真いろは',
    'hSD07': 'スターターデッキ 癒月ちょこ',
    'hPR': 'Promo',
  };

  const prefix = cardNumber.split('-')[0];
  return seriesMap[prefix] || prefix;
}

function extractRarity(cardNumber: string): string {
  // 臨時方案，後續從官方網站爬蟲
  const rarityMap: Record<string, string> = {
    'hBP01': 'SR',
    'hBP02': 'SR',
    'hBP03': 'SR',
    'hSD01': 'SR',
    'hSD02': 'SR',
    'hSD03': 'SR',
    'hSD04': 'SR',
    'hSD05': 'SR',
    'hSD06': 'SR',
    'hSD07': 'SR',
    'hPR': 'PR',
  };

  const prefix = cardNumber.split('-')[0];
  return rarityMap[prefix] || 'C';
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
