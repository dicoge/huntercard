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
      const sk = (c.searchKeywords || []).join(' ').toLowerCase();
      return (
        c.id.toLowerCase().includes(searchQ) ||
        c.name.toLowerCase().includes(searchQ) ||
        sk.includes(searchQ) ||
        (c.series || []).join(' ').toLowerCase().includes(searchQ) ||
        (c.tags || []).join(' ').toLowerCase().includes(searchQ)
      );
    });

    const seen = new Set<string>();
    const unique = matched.filter((c: any) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });

    const results = unique.map((c: any) => {
      const ver = (c.versions || ['_C.png'])[0];
      const colors = Array.isArray(c.color) ? c.color : [c.color].filter(Boolean);
      return {
        id: c.id, name: c.name, type: c.type, grade: c.grade,
        rarity: GRADE_RARITY[c.grade] || 'C',
        colors, colorNames: colors.map((x: string) => COLOR_MAP[x] || x),
        series: c.series || [], seriesNames: (c.series || []).map((s: string) => SERIES_NAMES[s] || s),
        tags: c.tags || [], cardNumber: c.id,
        imageFolder: c.imageFolder || '', versions: c.versions || [],
        searchKeywords: c.searchKeywords || [], effectType: c.effectType || '',
        imageUrl: `https://tetsunekko.github.io/holotcgtw/cards/${c.imageFolder || ''}${c.id}${ver}`,
        yuyuUrl: `https://yuyu-tei.jp/top/hocg/?s=${encodeURIComponent(c.id)}`,
        carousellUrl: `https://www.carousell.com.tw/search/?q=${encodeURIComponent(c.id)}`,
        officialUrl: `https://hololive-official-cardgame.com/cardlist/cardsearch/?keyword=${encodeURIComponent(c.id)}`,
      };
    });

    return Response.json({ query: q, total: results.length, results }, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (e: any) {
    return Response.json({ error: e.message || 'Search failed' }, {
      status: 500, headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
