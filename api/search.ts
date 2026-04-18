import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

const BASE = 'https://raw.githubusercontent.com/TETSUNekko/holotcgtw/main/client/src';
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

const GRADE_RARITY: Record<string, string> = {
  'debut': 'C',
  '1st': 'U',
  '2nd': 'R',
  'buzz': 'SR',
  'spot': 'N',
};

const COLOR_MAP: Record<string, string> = {
  'white': '白色',
  'blue': '藍色',
  'green': '綠色',
  'red': '紅色',
  'purple': '紫色',
  'yellow': '黃色',
  'colorless': '無色',
};

const SERIES_NAMES: Record<string, string> = {
  'hBP01': 'ブルーミングレディアンス',
  'hBP02': 'クインテットスペクトラム',
  'hBP03': 'サバイバル・オブ・ザ・フェイビアス',
  'hSD01': 'スターターデッキ ときのそら',
  'hSD02': 'スターターデッキ 白上フブキ',
  'hSD03': 'スターターデッキ 湊あくあ',
  'hSD04': 'スターターデッキ 天音かなた',
  'hSD05': 'スターターデッキ ReGLOSS',
  'hSD06': 'スターターデッキ 風真いろは',
  'hSD07': 'スターターデッキ 癒月ちょこ',
  'hPR': 'Promo',
  'hBD24': 'Bandai Distribution 2024',
  'hY': 'Yokohama Promo',
};

interface RawCard {
  id: string;
  type: string;
  name: string;
  imageFolder: string;
  color: string | string[];
  grade: string;
  series: string[];
  searchKeywords: string[];
  versions: string[];
  tags?: string[];
  effectType?: string;
}

interface CardResult {
  id: string;
  name: string;
  type: string;
  grade: string;
  rarity: string;
  colors: string[];
  colorNames: string[];
  series: string[];
  seriesNames: string[];
  tags: string[];
  cardNumber: string;
  imageUrl: string;
  yuyuUrl: string;
  carousellUrl: string;
  officialUrl: string;
  matchedKeyword: string;
}

export default async function handler(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  try {
    const searchQuery = query.toLowerCase().trim();

    // 從 holotcgtw 拉所有卡牌資料
    const allCards: RawCard[] = [];
    const errors: string[] = [];

    await Promise.all(
      CARD_FILES.map(async (file) => {
        try {
          const res = await fetch(`${BASE}/${file}`, {
            headers: { 'Accept': 'application/json' },
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              allCards.push(...data);
            }
          }
        } catch (e: any) {
          errors.push(`${file}: ${e.message}`);
        }
      })
    );

    // 搜尋
    const matched = allCards.filter((card) => {
      return (
        card.id.toLowerCase().includes(searchQuery) ||
        card.name.toLowerCase().includes(searchQuery) ||
        card.searchKeywords.some((kw) => kw.toLowerCase().includes(searchQuery)) ||
        card.series.some((s) => s.toLowerCase().includes(searchQuery)) ||
        card.tags?.some((t) => t.toLowerCase().includes(searchQuery)) ||
        card.type.toLowerCase().includes(searchQuery) ||
        card.grade.toLowerCase().includes(searchQuery)
      );
    });

    // 去重複（同一 id 保留）
    const seen = new Set<string>();
    const unique = matched.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    // 找到匹配關鍵字
    const findMatchedKeyword = (card: RawCard, q: string) => {
      const lower = q.toLowerCase();
      if (card.id.toLowerCase().includes(lower)) return card.id;
      for (const kw of card.searchKeywords) {
        if (kw.toLowerCase().includes(lower)) return kw;
      }
      if (card.name.toLowerCase().includes(lower)) return card.name;
      return card.id;
    };

    const results: CardResult[] = unique.map((card) => {
      const version = card.versions?.[0] || '_C.png';
      const imageUrl = `https://tetsunekko.github.io/holotcgtw/cards/${card.imageFolder}${card.id}${version}`;

      return {
        id: card.id,
        name: card.name,
        type: card.type,
        grade: card.grade,
        rarity: GRADE_RARITY[card.grade] || 'C',
        colors: Array.isArray(card.color) ? card.color : [card.color].filter(Boolean),
        colorNames: (Array.isArray(card.color) ? card.color : [card.color].filter(Boolean)).map(
          (c: string) => COLOR_MAP[c] || c
        ),
        series: card.series,
        seriesNames: card.series.map((s) => SERIES_NAMES[s] || s),
        tags: card.tags || [],
        cardNumber: card.id,
        imageUrl,
        yuyuUrl: `https://yuyu-tei.jp/top/hocg/?s=${encodeURIComponent(card.id)}`,
        carousellUrl: `https://www.carousell.com.tw/search/?q=${encodeURIComponent(card.id)}`,
        officialUrl: `https://hololive-official-cardgame.com/cardlist/cardsearch/?keyword=${encodeURIComponent(card.id)}`,
        matchedKeyword: findMatchedKeyword(card, searchQuery),
      };
    });

    return NextResponse.json(
      {
        query,
        total: results.length,
        results,
        sources: ['holotcgtw GitHub', '遊々亭', 'Carousell', '官方卡表'],
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 's-maxage=3600, stale-while-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search cards' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
