// Vercel Edge Function - fetches card image URL from official hololive TCG website
// This returns the actual image URL from the official site

const CARD_DATA_BASE = 'https://raw.githubusercontent.com/TETSUNekko/holotcgtw/main/client/src';

const CARD_FILES = [
  'cardList_hBP01.json', 'cardList_hBP02.json', 'cardList_hBP03.json',
  'cardList_hSD01.json', 'cardList_hSD02.json', 'cardList_hSD03.json',
  'cardList_hSD04.json', 'cardList_hSD05.json', 'cardList_hSD06.json',
  'cardList_hSD07.json', 'cardList_hPR.json', 'cardList_hBD24.json', 'cardList_hY.json',
];

export const config = {
  runtime: 'edge',
};

function safe(v: any, d = '') { return v != null ? String(v) : d; }

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q');

  if (!q) {
    return Response.json({ error: 'Missing q param' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const cardId = q.trim();

    // 1. Find card data from holotcgtw
    let cardData: any = null;
    for (const file of CARD_FILES) {
      try {
        const res = await fetch(CARD_DATA_BASE + '/' + file);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const found = data.find((c: any) => c.id === cardId);
            if (found) { cardData = found; break; }
          }
        }
      } catch (_) { /* skip */ }
    }

    if (!cardData) {
      return Response.json({ error: 'Card not found' }, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const imgFolder = safe(cardData.imageFolder);
    const versions = cardData.versions || [];
    let version = versions[0] || '_C.png';

    // For member cards, prefer _C or _U version
    if (cardData.type !== 'Oshi' && cardData.type !== 'Support') {
      const memberVer = versions.find((v: string) => v.includes('_C.png')) || versions.find((v: string) => v.includes('_U.png'));
      if (memberVer) version = memberVer;
    }

    // 2. Construct official image URL
    // The official site serves images at: https://hololive-official-cardgame.com/wp-content/themes/hololive-cardgame/images/card/{series}/{card-number}.png
    // But we don't know the exact path pattern. Let's try to fetch from the official card page and extract the image.
    
    const officialImageUrl = `https://hololive-official-cardgame.com/wp-content/themes/hololive-cardgame/images/card/${cardId}.png`;
    
    // 3. Try to verify if the image exists
    try {
      const imgRes = await fetch(officialImageUrl, { method: 'HEAD' });
      if (imgRes.ok) {
        return Response.json({ cardId, imageUrl: officialImageUrl, found: true }, {
          headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=86400' },
        });
      }
    } catch (_) { /* image might not exist */ }

    // 4. Alternative: try to get from official site via series folder
    const seriesCode = cardId.split('-')[0] || '';
    const seriesImageUrl = `https://hololive-official-cardgame.com/wp-content/themes/hololive-cardgame/images/${seriesCode}/${cardId}.png`;
    
    try {
      const imgRes = await fetch(seriesImageUrl, { method: 'HEAD' });
      if (imgRes.ok) {
        return Response.json({ cardId, imageUrl: seriesImageUrl, found: true }, {
          headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=86400' },
        });
      }
    } catch (_) { /* try next */ }

    // 5. If no direct image found, return the official card list detail URL for iframe embedding
    const detailUrl = `https://hololive-official-cardgame.com/cardlist/?keyword=${encodeURIComponent(cardId)}&view=image`;

    return Response.json({
      cardId,
      cardData: {
        id: cardData.id,
        name: safe(cardData.name),
        type: safe(cardData.type),
        versions,
        imageFolder: imgFolder,
        version,
      },
      imageUrl: null, // No direct image found
      detailUrl, // Use this for iframe embedding
      message: 'No direct image found. Use detailUrl for iframe display.',
    }, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' },
    });

  } catch (e: any) {
    return Response.json({ error: e.message || 'Failed to fetch card image' }, {
      status: 500, headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
