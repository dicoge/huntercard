// Vercel Edge Function: Extract actual card image URL from official site
// The image URL pattern is: /wp-content/images/cardlist/{series}/{card-id}_{version}.png

export const config = { runtime: 'edge' };

async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  if (!q) return Response.json({ error: 'Missing q param' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });

  const cardNumber = q.trim();
  const seriesCode = cardNumber.split('-')[0] || '';
  const OFFICIAL_BASE = 'https://hololive-official-cardgame.com';

  try {
    // Method 1: Try to fetch the card search page and extract the actual image URL
    const searchUrl = `${OFFICIAL_BASE}/cardlist/cardsearch/?expansion=${encodeURIComponent(seriesCode)}`;
    const resp = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (resp.ok) {
      const html = await resp.text();

      // Find all image URLs for this card number
      // Pattern: /wp-content/images/cardlist/hBP01/hBP01-001_OSR.png
      const regex = new RegExp(`"([^"]*images/cardlist/${seriesCode}/${cardNumber}[^"]*\\.(png|jpg))"`, 'g');
      const matches: string[] = [];
      let match;
      while ((match = regex.exec(html)) !== null) {
        const imgUrl = match[1];
        if (imgUrl.includes(cardNumber) && !matches.includes(imgUrl)) {
          matches.push(imgUrl);
        }
      }

      if (matches.length > 0) {
        // Return the first image found, preferring member card versions
        let imageUrl = matches[0];
        // Try to find _C or _U version (member card art)
        const memberVer = matches.find(u => u.includes('_C.png') || u.includes('_U.png'));
        if (memberVer) imageUrl = memberVer;

        const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${OFFICIAL_BASE}${imageUrl}`;

        return Response.json(
          { cardNumber, imageUrl: fullUrl, found: true, method: 'extracted', allVersions: matches },
          { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=86400' } }
        );
      }
    }

    // Method 2: Construct likely URLs and test them
    const versions = ['_C.png', '_U.png', '_OSR.png', '_R.png', '_OUR.png', '_P.png'];
    for (const ver of versions) {
      const testUrl = `${OFFICIAL_BASE}/wp-content/images/cardlist/${seriesCode}/${cardNumber}${ver}`;
      const testResp = await fetch(testUrl, { method: 'HEAD' });
      if (testResp.ok && (testResp.headers.get('content-type') || '').includes('image')) {
        return Response.json(
          { cardNumber, imageUrl: testUrl, found: true, method: 'direct-check' },
          { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=86400' } }
        );
      }
    }

    // Not found
    return Response.json(
      {
        cardNumber,
        imageUrl: null,
        found: false,
        searchUrl: `${OFFICIAL_BASE}/cardlist/?keyword=${encodeURIComponent(cardNumber)}&view=image`,
      },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (e: any) {
    return Response.json({ error: e.message }, {
      status: 500, headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}

export { handler as default };
