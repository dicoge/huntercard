import { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import { load } from 'cheerio';

export const config = {
  runtime: 'nodejs',
};

interface SearchResult {
  source: string;
  items: SearchResultItem[];
}

interface SearchResultItem {
  title: string;
  price?: number;
  url: string;
  imageUrl?: string;
  inStock?: boolean;
  description?: string;
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
    // 爬蟲各網站
    const results = await Promise.all([
      scrapeOfficial(q),
      scrapeYuyuTei(q),
    ]);

    const searchResults: SearchResult[] = results.filter((r): r is SearchResult => r !== null);

    // 快取 30 分鐘
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    
    return res.status(200).json({
      query: q,
      results: searchResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Failed to search' });
  }
}

async function scrapeOfficial(query: string): Promise<SearchResult | null> {
  try {
    // 先從卡牌列表頁面抓取所有卡牌
    const cardlistUrl = 'https://hololive-official-cardgame.com/cardlist/';
    
    const response = await fetch(cardlistUrl, {
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
    
    const items: SearchResultItem[] = [];
    
    // 解析官方網站的卡牌列表，找出符合查詢的卡牌
    $('a[href*="/cardlist/cardsearch/"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();
      
      if (href && text) {
        // 檢查是否符合查詢關鍵字
        if (query === '' || text.includes(query) || href.includes(query)) {
          // 提取系列代碼
          const codeMatch = href.match(/expansion=([^&]+)/);
          const seriesCode = codeMatch ? codeMatch[1] : '';
          
          items.push({
            title: text,
            url: href.startsWith('http') ? href : `https://hololive-official-cardgame.com${href}`,
            description: seriesCode ? `系列代碼: ${seriesCode}` : undefined,
          });
        }
      }
    });
    
    // 去重
    const uniqueItems = items.filter((item, index, self) => 
      index === self.findIndex(t => t.url === item.url)
    );
    
    return {
      source: '官方卡牌列表',
      items: uniqueItems.slice(0, 20),
    };
  } catch (error) {
    console.error('Official scraping error:', error);
    return null;
  }
}

async function scrapeYuyuTei(query: string): Promise<SearchResult | null> {
  try {
    const searchUrl = `https://yuyu-tei.jp/top/hocg/?s=${encodeURIComponent(query)}`;
    
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
    
    const items: SearchResultItem[] = [];
    
    // 解析遊々亭的搜尋結果
    $('article, .product-entry, .card-product').each((i, elem) => {
      const title = $(elem).find('a').first().text().trim();
      const href = $(elem).find('a').first().attr('href');
      const priceText = $(elem).find('.price, .amount').first().text().trim();
      const price = parseInt(priceText.replace(/[^0-9]/g, ''));
      
      if (title && href) {
        items.push({
          title,
          url: href.startsWith('http') ? href : `https://yuyu-tei.jp${href}`,
          price: isNaN(price) ? undefined : price,
          inStock: !$(elem).find('.sold-out, .out-of-stock, 在庫なし').length,
        });
      }
    });
    
    // 如果解析失敗，嘗試另一種格式
    if (items.length === 0) {
      $('a[href*="/product/"]').each((i, elem) => {
        const title = $(elem).text().trim();
        const href = $(elem).attr('href');
        
        if (title && href && title.length > 0 && title.length < 200) {
          items.push({
            title,
            url: href.startsWith('http') ? href : `https://yuyu-tei.jp${href}`,
          });
        }
      });
    }
    
    return {
      source: '遊々亭',
      items: items.slice(0, 20),
    };
  } catch (error) {
    console.error('Yuyu-tei scraping error:', error);
    return null;
  }
}
