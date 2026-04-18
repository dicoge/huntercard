// Vercel Edge Function - uses standard web APIs
const CARD_FILES = [
  'cardList_hBP01.json',
  'cardList_hBP02.json',
  'cardList_hBP03.json',
  'cardList_hSD01.json',
  'cardList_hSD02.json',
  'cardList_hSD03.json',
  'cardList_hSD04.json',
  'cardList_hSD05.json',
  'cardList_hSD06.json',
  'cardList_hSD07.json',
  'cardList_hPR.json',
  'cardList_hBD24.json',
  'cardList_hY.json',
];

const BASE = 'https://raw.githubusercontent.com/TETSUNekko/holotcgtw/main/client/src';

const GRADE_RARITY: Record<string, string> = {
  debut: 'C', '1st': 'U', '2nd': 'R', buzz: 'SR', spot: 'N',
};

const COLOR_MAP: Record<string, string> = {
  white: '白色', blue: '藍色', green: '綠色', red: '紅色',
  purple: '紫色', yellow: '黃色', colorless: '無色',
};

const SERIES_NAMES: Record<string, string> = {
  hBP01: 'ブルーミングレディアンス',
  hBP02: 'クインテットスペクトラム',
  hBP03: 'サバイバル・オブ・ザ・フェイビアス',
  hSD01: 'スターターデッキ ときのそら',
  hSD02: 'スターターデッキ 白上フブキ',
  hSD03: 'スターターデッキ 湊あくあ',
  hSD04: 'スターターデッキ 天音かなた',
  hSD05: 'スターターデッキ ReGLOSS',
  hSD06: 'スターターデッキ 風真いろは',
  hSD07: 'スターターデッキ 癒月ちょこ',
  hPR: 'Promo',
  hBD24: 'Bandai Distribution 2024',
  hY: 'Yokohama Promo',
};

async function handler(request: Request) {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter "q" is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const searchQuery = query.toLowerCase().trim();

    // Fetch all card files from holotcgtw
    const allCards: any[] = [];
    await Promise.all(
      CARD_FILES.map(async (file) => {
        try {
          const res = await fetch(`${BASE}/${file}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) allCards.push(...data);
          }
        } catch (_) { /* skip failed files */ }
      })
    );

    // Search cards
    const matched = allCards.filter((card) => {
      return (
        card.id.toLowerCase().includes(searchQuery) ||
        card.name.toLowerCase().includes(searchQuery) ||
        card.searchKeywords?.some((kw: string) => kw.toLowerCase().includes(searchQuery)) ||
        card.series?.some((s: string) => s.toLowerCase().includes(searchQuery)) ||
        card.tags?.some((t: string) => t.toLowerCase().includes(searchQuery))
      );
    });

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = matched.filter((c: any) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    const findMatchedKeyword = (card: any, q: string) => {
      const lower = q.toLowerCase();
      if (card.id.toLowerCase().includes(lower)) return card.id;
      for (const kw of card.searchKeywords || []) {
        if (kw.toLowerCase().includes(lower)) return kw;
      }
      return card.name || card.id;
    };

    const results = unique.map((card: any) => {
      const version = card.versions?.[0] || '_C.png';
      const imageUrl = `https://tetsunekko.github.io/holotcgtw/cards/${card.imageFolder}${card.id}${version}`;
      const colors = Array.isArray(card.color) ? card.color : [card.color].filter(Boolean);

      return {
        id: card.id,
        name: card.name,
        type: card.type,
        grade: card.grade,
        rarity: GRADE_RARITY[card.grade] || 'C',
        colors,
        colorNames: colors.map((c: string) => COLOR_MAP[c] || c),
        series: card.series || [],
        seriesNames: (card.series || []).map((s: string) => SERIES_NAMES[s] || s),
        tags: card.tags || [],
        cardNumber: card.id,
        imageFolder: card.imageFolder,
        versions: card.versions,
        searchKeywords: card.searchKeywords,
        effectType: card.effectType,
        imageUrl,
        yuyuUrl: `https://yuyu-tei.jp/top/hocg/?s=${encodeURIComponent(card.id)}`,
        carousellUrl: `https://www.carousell.com.tw/search/?q=${encodeURIComponent(card.id)}`,
        officialUrl: `https://hololive-official-cardgame.com/cardlist/cardsearch/?keyword=${encodeURIComponent(card.id)}`,
        matchedKeyword: findMatchedKeyword(card, searchQuery),
      };
    });

    return new Response(JSON.stringify({ query, total: results.length, results }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to search cards' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export { handler };
export const config = { runtime: 'edge' };

export default handler;
