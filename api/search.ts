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

function safe(v: any, fallback = '') {
  return v != null ? String(v) : fallback;
}

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

    const results = unique.map((c: any) => {
      const id = safe(c.id);
      const name = safe(c.name);
      const imgFolder = safe(c.imageFolder);
      const ver = (c.versions && c.versions.length > 0) ? c.versions[0] : '_C.png';
      const rawColors = Array.isArray(c.color) ? c.color : [c.color];
      const colors = rawColors.filter(Boolean).map(String);

      return {
        id, name,
        type: safe(c.type),
        grade: safe(c.grade),
        rarity: GRADE_RARITY[safe(c.grade)] || 'C',
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
        imageUrl: `https://tetsunekko.github.io/holotcgtw/cards/${imgFolder}${id}${ver}`,
        yuyuUrl: `https://yuyu-tei.jp/top/hocg/?s=${encodeURIComponent(id)}`,
        carousellUrl: `https://www.carousell.com.tw/search/?q=${encodeURIComponent(id)}`,
        officialUrl: `https://hololive-official-cardgame.com/cardlist/cardsearch/?keyword=${encodeURIComponent(id)}`,
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
