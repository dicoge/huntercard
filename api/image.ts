// Proxy API for card images
// Fetches card images from the official hololive TCG website
// Usage: /api/image?card=hBP01-001

export const config = {
  runtime: 'edge',
};

async function scrapeImageFromOfficial(cardNumber: string): Promise<string | null> {
  try {
    const seriesCode = cardNumber.split('-')[0];
    const searchUrl = `https://hololive-official-cardgame.com/cardlist/cardsearch/?expansion=${encodeURIComponent(seriesCode)}`;

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://hololive-official-cardgame.com',
      },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Find all image URLs for this specific card
    const pattern = new RegExp(`"/wp-content/images/cardlist/${seriesCode}/${cardNumber}[^"]*\\.(png|jpg)"`, 'g');
    const urls: string[] = [];
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = match[0].replace(/"/g, '');
      if (url && !urls.includes(url)) urls.push(url);
    }

    if (urls.length === 0) return null;

    // Priority: _C > _U > _R > _OSR > _OUR > any other
    const priority = ['_C.png', '_U.png', '_R.png', '_OSR.png', '_OUR.png', '_P.png'];
    for (const p of priority) {
      const found = urls.find(u => u.endsWith(p));
      if (found) return found;
    }

    return urls[0];
  } catch {
    return null;
  }
}

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' },
    });
  }

  const url = new URL(request.url);
  const cardNumber = url.searchParams.get('card');

  if (!cardNumber) {
    return new Response(JSON.stringify({ error: 'Missing card parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    // 1. Find the correct image path from official site
    let imagePath = await scrapeImageFromOfficial(cardNumber);

    // 2. Fallback: construct likely path
    if (!imagePath) {
      const seriesCode = cardNumber.split('-')[0];
      imagePath = `/wp-content/images/cardlist/${seriesCode}/${cardNumber}_OSR.png`;
    }

    // 3. Fetch the actual image
    const imageUrl = imagePath.startsWith('http') ? imagePath : `https://hololive-official-cardgame.com${imagePath}`;
    const imgResp = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://hololive-official-cardgame.com',
      },
    });

    if (!imgResp.ok || !imgResp.headers.get('content-type')?.includes('image')) {
      return new Response(JSON.stringify({ error: 'Image not found', url: imageUrl }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data = await imgResp.arrayBuffer();
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': imgResp.headers.get('content-type') || 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
