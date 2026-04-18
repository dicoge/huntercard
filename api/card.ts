import { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import { load } from 'cheerio';

export const config = {
  runtime: 'nodejs',
};

interface CardInfo {
  cardNumber: string;
  member: string;
  memberJp: string;
  series: string;
  seriesCode: string;
  rarity: string;
  imageUrl?: string;
  description?: string;
  price?: {
    source: string;
    value: number;
    currency: string;
    url: string;
    inStock: boolean;
  };
  officialUrl: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 允許 CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    // 從官方網站取得卡牌資訊
    const cardInfo = await scrapeOfficialCardInfo(q);
    
    if (!cardInfo) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // 從遊々亭取得價格
    const price = await scrapeYuyuTeiPrice(q);
    
    cardInfo.price = price;

    // 快取 1 小時
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    
    return res.status(200).json(cardInfo);
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Failed to search' });
  }
}

async function scrapeOfficialCardInfo(cardNumber: string): Promise<CardInfo | null> {
  try {
    // 從卡號提取系列代碼
    const seriesCode = cardNumber.split('-')[0] || '';
    const officialUrl = `https://hololive-official-cardgame.com/cardlist/cardsearch/?expansion=${seriesCode}`;
    
    const response = await fetch(officialUrl, {
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
    
    // 嘗試找到該卡號的卡牌資訊
    let found = false;
    let member = '';
    let memberJp = '';
    let rarity = '';
    let imageUrl = '';
    
    // 解析官方網站的卡牌資訊
    // 需要根據實際 HTML 結構調整
    $('a, .card, .product').each((i, elem) => {
      const text = $(elem).text();
      if (text.includes(cardNumber)) {
        found = true;
        // 嘗試提取成員名稱
        const title = $(elem).find('h1, h2, h3, h4, .title').first().text().trim();
        if (title) {
          member = title;
          memberJp = title;
        }
      }
    });
    
    // 構建卡牌圖片 URL
    const cardImageUrl = `https://hololive-official-cardgame.com/wp-content/themes/hololive-cardgame/images/card/${cardNumber}.png`;
    
    // 從系列代碼推斷系列名稱
    const seriesNames: Record<string, string> = {
      'hBP01': 'ブルーミングレディアンス',
      'hBP02': 'クインテットスペクトラム',
      'hBP03': 'エリートスパーク',
      'hBP04': 'キュリアスユニバース',
      'hBP05': 'エンチャントレガリア',
      'hBP06': 'アヤカシヴァーミリオン',
      'hBP07': 'ディーヴァフィーバー',
      'hSD01': 'スタートデッキ「ときのそら＆AZKi」',
      'hSD02': 'スタートデッキ 赤 百鬼あやめ',
      'hSD03': 'スタートデッキ 青 猫又おかゆ',
      'hSD04': 'スタートデッキ 紫 癒月ちょこ',
      'hSD05': 'スタートデッキ 白 轟はじめ',
      'hSD06': 'スタートデッキ 緑 風真いろは',
      'hSD07': 'スタートデッキ 黄 不知火フレア',
      'hSD08': 'スタートデッキ 白 天音かなた',
      'hSD09': 'スタートデッキ 赤 宝鐘マリン',
      'hSD10': 'スタートデッキ FLOW GLOW 推し 輪堂千速',
      'hSD11': 'スタートデッキ FLOW GLOW 推し 虎金妃笑虎',
      'hSD12': 'スタートデッキ 推し Advent',
      'hSD13': 'スタートデッキ 推し Justice',
      'hSD14': 'ライブスタートデッキ 白上フブキ',
      'hSD15': 'ライブスタートデッキ 儒烏風亭らでん',
      'hSD16': 'ライブスタートデッキ さくらみこ',
      'hSD17': 'ライブスタートデッキ 星街すいせい',
      'hSD18': 'ライブスタートデッキ 森カリオペ',
      'hSD19': 'ライブスタートデッキ 大空スバル',
    };
    
    const seriesName = seriesNames[seriesCode] || seriesCode;
    
    return {
      cardNumber,
      member: member || '不明',
      memberJp: memberJp || '',
      series: seriesName,
      seriesCode,
      rarity: rarity || 'R',
      imageUrl: cardImageUrl,
      description: '',
      officialUrl,
    };
  } catch (error) {
    console.error('Official scraping error:', error);
    return null;
  }
}

async function scrapeYuyuTeiPrice(cardNumber: string): Promise<CardInfo['price'] | null> {
  try {
    const searchUrl = `https://yuyu-tei.jp/top/hocg/?s=${encodeURIComponent(cardNumber)}`;
    
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
    
    // 解析遊々亭的價格
    $('.price, .amount, .sell-price').each((i, elem) => {
      const priceText = $(elem).text().trim();
      const match = priceText.match(/¥?\s?(\d+,?\d*)/);
      if (match) {
        price = parseInt(match[1].replace(/,/g, ''));
      }
    });
    
    // 檢查庫存
    if ($('.sold-out, .out-of-stock, 在庫なし').length > 0) {
      inStock = false;
    }
    
    return {
      source: '遊々亭',
      value: price || 0,
      currency: 'TWD',
      url: searchUrl,
      inStock,
    };
  } catch (error) {
    console.error('Yuyu-tei scraping error:', error);
    return null;
  }
}
