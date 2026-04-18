// Edge API: Extract card image URL from the official hololive TCG website
// Returns a JSON response with the card image URL that can be used directly in <img> tags

export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const url = new URL(request.url);
  const cardNumber = url.searchParams.get('q');
  if (!cardNumber) {
    return Response.json({ error: 'Missing card number (q parameter)' }, {
      status: 400, headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const id = cardNumber.trim();

    // Try different image URL patterns from the official site
    const candidates = [
      // Pattern 1: Official CDN (most likely)
      `https://hololive-official-cardgame.com/wp-content/themes/hololive-cardgame/images/card/${id}.png`,
      // Pattern 2: Alternative CDN path
      `https://hololive-official-cardgame.com/wp-content/uploads/card/${id}.png`,
    ];

    for (const imgUrl of candidates) {
      try {
        const imgRes = await fetch(imgUrl, { method: 'HEAD' });
        if (imgRes.ok) {
          const contentType = imgRes.headers.get('content-type') || '';
          if (contentType.includes('image')) {
            return Response.json({ cardNumber: id, imageUrl: imgUrl, found: true }, {
              headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=86400' }
            });
          }
        }
      } catch (_) { /* try next */ }
    }

    // If no direct image found, return the official search page URL
    // Frontend can use this to open in a new tab
    return Response.json({
      cardNumber: id,
      imageUrl: null,
      found: false,
      searchUrl: `https://hololive-official-cardgame.com/cardlist/?keyword=${encodeURIComponent(id)}&view=image`,
      cardSearchUrl: `https://hololive-official-cardgame.com/cardlist/cardsearch/?keyword=${encodeURIComponent(id)}`,
      message: 'No direct image URL found. Use searchUrl to view on official website.',
    }, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' }
    });

  } catch (e: any) {
    return Response.json({ error: e.message || 'Failed to get image' }, {
      status: 500, headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}
