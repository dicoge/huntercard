// Vercel Edge Function - fetch card image from holotcgtw GitHub Pages or official site
// This runs on-demand, no caching/record-keeping

export const config = {
  runtime: 'edge',
  regions: ['hnd1'], // Tokyo for better latency to TW/JP
};

const CARD_DATA_BASE = 'https://raw.githubusercontent.com/TETSUNekko/holotcgtw/main/client/src';

const CARD_FILES = [
  'cardList_hBP01.json', 'cardList_hBP02.json', 'cardList_hBP03.json',
  'cardList_hSD01.json', 'cardList_hSD02.json', 'cardList_hSD03.json',
  'cardList_hSD04.json', 'cardList_hSD05.json', 'cardList_hSD06.json',
  'cardList_hSD07.json', 'cardList_hPR.json', 'cardList_hBD24.json', 'cardList_hY.json',
];

function safe(v: any, fallback = '') {
  return v != null ? String(v) : fallback;
}

// Try to find the card image from holotcgtw data, then return the image URL
// holotcgtw GitHub Pages doesn't host images, so we return the official card detail URL
// The frontend can then use an iframe or link to view it

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q');

  if (!q) {
    return Response.json({ error: 'Missing q param' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const cardId = q.trim();

    // Search through all card files to find the card data
    let cardData: any = null;

    for (const file of CARD_FILES) {
      try {
        const res = await fetch(`${CARD_DATA_BASE}/${file}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const found = data.find((c: any) => c.id === cardId);
            if (found) {
              cardData = found;
              break;
            }
          }
        }
      } catch (_) { /* skip */ }
    }

    if (!cardData) {
      return Response.json({ error: 'Card not found' }, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // Get version info
    const versions = cardData.versions || [];
    const imgFolder = safe(cardData.imageFolder);
    let version = versions[0] || '_C.png';

    // For member cards, prefer _C or _U; for Oshi, prefer _OSR
    if (cardData.type === 'Oshi') {
      version = versions.find((v: string) => v.includes('_OSR')) || version;
    } else {
      const memberVersion = versions.find((v: string) => v.includes('_C.png')) || versions.find((v: string) => v.includes('_U.png'));
      if (memberVersion) version = memberVersion;
    }

    // holotcgtw cards folder doesn't actually host images on GitHub Pages
    // Instead, return the official card detail page URL for frontend to display
    const officialDetailUrl = `https://hololive-official-cardgame.com/cardlist/cardsearch/?keyword=${cardId}`;

    return Response.json({
      cardId,
      name: safe(cardData.name),
      type: safe(cardData.type),
      imageUrl: null, // No direct image available from holotcgtw
      officialDetailUrl,
      versions,
      imageFolder: imgFolder,
      version,
      // The frontend can display the official card page via iframe or link
      message: 'Use officialDetailUrl to view card image on official website',
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e: any) {
    return Response.json({ error: e.message || 'Failed to fetch card' }, {
      status: 500, headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
