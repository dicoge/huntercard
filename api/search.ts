const CARD_FILES = [
  'cardList_hBP01.json', 'cardList_hBP02.json', 'cardList_hBP03.json',
  'cardList_hSD01.json', 'cardList_hSD02.json', 'cardList_hSD03.json',
  'cardList_hSD04.json', 'cardList_hSD05.json', 'cardList_hSD06.json',
  'cardList_hSD07.json', 'cardList_hPR.json', 'cardList_hBD24.json', 'cardList_hY.json',
];
const BASE = 'https://raw.githubusercontent.com/TETSUNekko/holotcgtw/main/client/src';

// Official card data files (scraped from official site)
// Using all-cards.json for comprehensive data
const OFFICIAL_FILES = [
  'all-cards.json',
];
const OFFICIAL_BASE = 'https://raw.githubusercontent.com/dicoge/hunterCard/main/data/official';
const GRADE_RARITY: Record<string, string> = { debut: 'C', '1st': 'U', '2nd': 'R', buzz: 'SR', spot: 'N' };
const COLOR_MAP: Record<string, string> = {
  white: '白色', blue: '藍色', green: '綠色', red: '紅色',
  purple: '紫色', yellow: '黃色', colorless: '無色',
};
const SERIES_NAMES: Record<string, string> = {
  hBP01: 'ブルーミングレディアンス', hBP02: 'クインテットスペクトラム',
  hBP03: 'サバイバル・オブ・ザ・フェイビアス',
  hBP04: 'キュリアスユニバース', hBP05: 'エンチャントレガリア',
  hBP06: 'アヤカシヴァーミリオン', hBP07: 'ディーヴァフィーバー',
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

    // Fetch from holotcgtw (primary source)
    for (const file of CARD_FILES) {
      try {
        const res = await fetch(BASE + '/' + file);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) allCards.push(...data);
        }
      } catch (_) { /* skip */ }
    }

    // Fetch official data for newer series (fallback source)
    for (const file of OFFICIAL_FILES) {
      try {
        const res = await fetch(OFFICIAL_BASE + '/' + file);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) allCards.push(...data);
        }
      } catch (_) { /* skip */ }
    }

    const matched = allCards.filter((c: any) => {
      // Support both holotcgtw and official formats
      const internalId = safe(c.id).toLowerCase();
      const cardNum = safe(c.cardNumber).toLowerCase();
      const name = safe(c.name).toLowerCase();
      const sk = (c.searchKeywords || []).map((k: any) => safe(k).toLowerCase()).join(' ');
      const series = (c.series || [c.expansion]).map((s: any) => safe(s).toLowerCase()).join(' ');
      const tags = (c.tags || []).map((t: any) => safe(t).toLowerCase()).join(' ');
      return internalId.includes(searchQ) || cardNum.includes(searchQ) || name.includes(searchQ) || sk.includes(searchQ) || series.includes(searchQ) || tags.includes(searchQ);
    });

    const seen = new Set<string>();
    const unique = matched.filter((c: any) => {
      const id = safe(c.cardNumber || c.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const results = await Promise.all(unique.map(async (c: any) => {
      // Support both holotcgtw and official formats
      // Prefer cardNumber for display, fallback to id
      const id = safe(c.cardNumber || c.id);
      const name = safe(c.name);
      
      // Check if this is official data (has expansion field but no series)
      const isOfficial = c.expansion && !c.series;
      
      // For official data, extract image folder from imageUrl or use expansion
      const imgFolder = isOfficial 
        ? (c.imageUrl ? c.imageUrl.match(/\/cardlist\/([^\/]+)\//)?.[1] + '/' : `${c.expansion}/`)
        : safe(c.imageFolder);
      
      // Determine image version suffix
      let ver = '_C.png';
      if (c.versions && c.versions.length > 0) {
        ver = c.versions[0];
      } else if (isOfficial && c.rarity) {
        // Map official rarity codes to image suffixes
        const rc = c.rarity.toUpperCase();
        if (rc.includes('OSR') || rc.includes('OUR')) ver = '_OSR.png';
        else if (rc === 'UR') ver = '_UR.png';
        else if (rc === 'SR') ver = '_SR.png';
        else if (rc === 'RR') ver = '_RR.png';
        else if (rc === 'R') ver = '_R.png';
        else if (rc === 'U') ver = '_U.png';
        else if (rc === 'C') ver = '_C.png';
        else if (rc === 'N') ver = '_N.png';
      }
      const rawColors = Array.isArray(c.color) ? c.color : [c.color];
      const colors = rawColors.filter(Boolean).map(String);

      // Effects: index 3+ from searchKeywords
      const effects = (c.searchKeywords || []).filter((kw: string, i: number) => {
        if (i < 3) return false;
        const gameTerms = ['給予', '抽', '傷害', '牌組', '手札', '成員', '中央', '藝能', 'HP', '生命', '階段', '回合', '特殊', '公開', '聯動', '擊倒', '剩餘', '持有', '超過', '以下', '以上', '最多', '技能', '備', '附於', '丟擲', '子', '奇數', '偶數', '回復', '存檔', '聲援', '舞台'];
        return gameTerms.some(term => kw.includes(term)) && kw.trim().length > 5;
      });

      // Image URL - always use official URL (holotcgtw images are 404)
      const imageUrl = `https://hololive-official-cardgame.com/wp-content/images/cardlist/${imgFolder}${id}${ver}`;

      // Series handling
      const series = isOfficial ? [c.expansion] : (c.series || []);
      
      // Grade/rarity mapping
      let grade = safe(c.grade);
      let rarity = GRADE_RARITY[grade] || (grade && ['debut','1st','2nd','buzz'].includes(grade) ? 'C' : 'N');
      
      // Official data uses rarity codes like OSR, UR, SR, RR, R, U, C, N
      if (isOfficial && c.rarity) {
        const rarityCode = c.rarity.toUpperCase();
        if (rarityCode.includes('OSR') || rarityCode.includes('OUR')) { grade = 'buzz'; rarity = 'SR'; }
        else if (rarityCode === 'UR') { grade = '2nd'; rarity = 'R'; }
        else if (rarityCode === 'SR') { grade = '1st'; rarity = 'U'; }
        else if (rarityCode === 'RR') { grade = 'debut'; rarity = 'C'; }
        else if (rarityCode === 'R') { grade = 'debut'; rarity = 'C'; }
        else if (rarityCode === 'U') { grade = 'debut'; rarity = 'C'; }
        else if (rarityCode === 'C') { grade = 'debut'; rarity = 'C'; }
        else if (rarityCode === 'N') { grade = 'spot'; rarity = 'N'; }
      }

      // Type mapping for official data
      let type = safe(c.type);
      if (isOfficial && c.cardType) {
        if (c.cardType.includes('推し')) type = 'Oshi';
        else if (c.cardType.includes('メンバー')) type = 'Member';
        else if (c.cardType.includes('サポート')) type = 'Support';
        else if (c.cardType.includes('エナジー')) type = 'Energy';
        else if (c.cardType.includes('バズ')) type = 'Buzz';
      }

      return {
        id, name,
        type,
        grade,
        rarity,
        colors,
        colorNames: colors.map((x: string) => COLOR_MAP[x] || x),
        series,
        seriesNames: series.map((s: any) => SERIES_NAMES[safe(s)] || safe(s)),
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
