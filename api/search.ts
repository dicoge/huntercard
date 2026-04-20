import { load as cheerioLoad } from 'cheerio';

const CARD_FILES = [
  'cardList_hBP01.json', 'cardList_hBP02.json', 'cardList_hBP03.json',
  'cardList_hSD01.json', 'cardList_hSD02.json', 'cardList_hSD03.json',
  'cardList_hSD04.json', 'cardList_hSD05.json', 'cardList_hSD06.json',
  'cardList_hSD07.json', 'cardList_hPR.json', 'cardList_hBD24.json', 'cardList_hY.json',
];
const BASE = 'https://raw.githubusercontent.com/TETSUNekko/holotcgtw/main/client/src';
const GRADE_RARITY: Record<string, string> = { debut: 'C', '1st': 'U', '2nd': 'R', buzz: 'SR', spot: 'N' };
const COLOR_MAP: Record<string, string> = {
  white: '白色', blue: '藍色', green: '綠色', red: '紅色',
  purple: '紫色', yellow: '黃色', colorless: '無色',
};
const SERIES_NAMES: Record<string, string> = {
  hBP01: 'ブルーミングレディアンス', hBP02: 'クインテットスペクトラム',
  hBP03: 'サバイバル・オブ・ザ・フェイビアス',
  hSD01: 'スターターデッキ ときのそら', hSD02: 'スターターデッキ 白上フブキ',
  hSD03: 'スターターデッキ 湊あくあ', hSD04: 'スターターデッキ 天音かなた',
  hSD05: 'スターターデッキ ReGLOSS', hSD06: 'スターターデッキ 風真いろは',
  hSD07: 'スターターデッキ 癒月ちょこ',
  hPR: 'Promo', hBD24: 'Bandai Distribution 2024', hY: 'Yokohama Promo',
};

// Rate limit: 允許最大 5 個並行請求
const MAX_CONCURRENT_REQUESTS = 5;
const requestQueue: Array<() => Promise<any>> = [];
let activeRequests = 0;

async function fetchWithRateLimit(url: string, options: RequestInit = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    const execute = async () => {
      try {
        activeRequests++;
        const response = await fetch(url, {
          ...options,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; HoloHunter/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            ...options.headers,
          }
        });
        resolve(response);
      } catch (error) {
        reject(error);
      } finally {
        activeRequests--;
        // Process next request in queue if available
        if (requestQueue.length > 0) {
          const next = requestQueue.shift();
          if (next) setTimeout(next, 100); // Minimal delay between requests
        }
      }
    };

    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
      execute();
    } else {
      requestQueue.push(execute);
    }
  });
}

// Simple in-memory cache for this Edge Function instance
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCached(key: string) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_DURATION) {
    return item.data;
  }
  return null;
}

function setCached(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
  // Clean old entries
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' } });
  }
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q');
    if (!q) return Response.json({ error: 'Missing q param' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });

    const searchQ = q.toLowerCase().trim();
    const allCards: any[] = [];

    for (const file of CARD_FILES) {
      try {
        const res = await fetch(BASE + '/' + file);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) allCards.push(...data);
        }
      } catch (_) { /* skip */ }
    }

    const matched = allCards.filter((c: any) => {
      const id = safe(c.id).toLowerCase();
      const name = safe(c.name).toLowerCase();
      const sk = (c.searchKeywords || []).map((k: any) => safe(k).toLowerCase()).join(' ');
      const series = (c.series || []).map((s: any) => safe(s).toLowerCase()).join(' ');
      const tags = (c.tags || []).map((t: any) => safe(t).toLowerCase()).join(' ');
      return id.includes(searchQ) || name.includes(searchQ) || sk.includes(searchQ) || series.includes(searchQ) || tags.includes(searchQ);
    });

    const seen = new Set<string>();
    const unique = matched.filter((c: any) => {
      const id = safe(c.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const results = await Promise.all(unique.map(async (c: any) => {
      const id = safe(c.id);
      const name = safe(c.name);
      const imgFolder = safe(c.imageFolder);
      const ver = (c.versions && c.versions.length > 0) ? c.versions[0] : '_C.png';
      const rawColors = Array.isArray(c.color) ? c.color : [c.color];
      const colors = rawColors.filter(Boolean).map(String);

      // Effects: index 3+ from searchKeywords
      const effects = (c.searchKeywords || []).filter((kw: string, i: number) => {
        if (i < 3) return false;
        const gameTerms = ['給予', '抽', '傷害', '牌組', '手札', '成員', '中央', '藝能', 'HP', '生命', '階段', '回合', '特殊', '公開', '聯動', '擊倒', '剩餘', '持有', '超過', '以下', '以上', '最多', '技能', '備', '附於', '丟擲', '子', '奇數', '偶數', '回復', '存檔', '聲援', '舞台'];
        return gameTerms.some(term => kw.includes(term)) && kw.trim().length > 5;
      });

      // Image URL (holotcgtw doesn't host images, but format is known)
      const imageUrl = `https://tetsunekko.github.io/holotcgtw/cards/${imgFolder}${id}${ver}`;

      // Fetch price data from yuyu-tei and Carousell
      const prices = await fetchPriceData(id);

      return {
        id, name,
        type: safe(c.type),
        grade: safe(c.grade),
        rarity: GRADE_RARITY[safe(c.grade)] || (c.grade && ['debut','1st','2nd','buzz'].includes(c.grade) ? 'C' : 'N'),
        colors,
        colorNames: colors.map((x: string) => COLOR_MAP[x] || x),
        series: (c.series || []).map(String),
        seriesNames: (c.series || []).map((s: any) => SERIES_NAMES[safe(s)] || safe(s)),
        tags: (c.tags || []).map(String),
        cardNumber: id,
        imageFolder: imgFolder,
        versions: (c.versions || []).map(String),
        searchKeywords: (c.searchKeywords || []).map(String),
        effectType: safe(c.effectType),
        effects,
        imageUrl,
        yuyuUrl: `https://yuyu-tei.jp/top/hocg/?s=${encodeURIComponent(id)}`,
        carousellUrl: `https://www.carousell.com.tw/search/?q=${encodeURIComponent(id)}`,
        officialUrl: `https://hololive-official-cardgame.com/cardlist/?keyword=${encodeURIComponent(id)}&view=image`,
        prices,
      };
    }));

    return Response.json({ query: q, total: results.length, results }, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (e: any) {
    return Response.json({ error: e.message || 'Search failed' }, {
      status: 500, headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

function safe(v: any, fallback = '') {
  return v != null ? String(v) : fallback;
}

// Fetch and parse price data from external sources
async function fetchPriceData(cardId: string) {
  try {
    // Try cache first
    const cacheKey = `prices_${cardId}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }

    const prices: any = {
      yuyu: null,
      carousell: null,
    };

    // Fetch from yuyu-tei (parallel but rate-limited)
    try {
      const yuyuResp = await fetchWithRateLimit(`https://yuyu-tei.jp/top/hocg/?s=${encodeURIComponent(cardId)}`);
      if (yuyuResp.ok) {
        const html = await yuyuResp.text();
        const $ = cheerioLoad(html);
        
        // Look for price elements - this needs to be adjusted based on actual site structure
        const priceElements = $('.price, .item-price, .price-value').first();
        const lowestPrice = priceElements.first().text().trim();
        
        if (lowestPrice && lowestPrice.includes('¥')) {
          prices.yuyu = {
            lowest: lowestPrice,
            fetchedAt: new Date().toISOString().split('T')[0],
            status: $('.stock, .availability').first().text().includes('在庫') ? 'in-stock' : 'few-left',
          };
        }
      }
    } catch (yuyuError) {
      console.warn(`Failed to fetch yuyu-tei data for ${cardId}:`, yuyuError);
    }

    // Fetch from Carousell
    try {
      const carousellResp = await fetchWithRateLimit(`https://www.carousell.com.tw/search/?q=${encodeURIComponent(cardId)}`);
      if (carousellResp.ok) {
        const html = await carousellResp.text();
        const $ = cheerioLoad(html);
        
        // Look for price elements on Carousell
        const priceElements = $('.price, .amount, [data-testid="price"]');
        const priceTexts = priceElements.map((_, el) => $(el).text().trim()).get();
        
        if (priceTexts.length > 0) {
          // Extract numeric prices and find min/max
          const numericPrices = priceTexts
            .map(text => {
              const match = text.match(/[\d,]+/);
              return match ? parseInt(match[0].replace(/,/g, '')) : 0;
            })
            .filter(num => num > 0);
            
          if (numericPrices.length > 0) {
            prices.carousell = {
              lowest: `NT$${Math.min(...numericPrices).toLocaleString()}`,
              count: priceTexts.length,
              fetchedAt: new Date().toISOString().split('T')[0],
            };
          }
        }
      }
    } catch (carousellError) {
      console.warn(`Failed to fetch Carousell data for ${cardId}:`, carousellError);
    }

    // Cache result for 5 minutes
    setCached(cacheKey, prices);
    
    return prices;
  } catch (error) {
    console.error(`Error fetching price data for ${cardId}:`, error);
    return { yuyu: null, carousell: null };
  }
}
