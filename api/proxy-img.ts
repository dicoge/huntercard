// Image proxy API - fetches card image from official site
// Usage: /api/proxy-img?url=/wp-content/images/cardlist/hBP01/hBP01-001_OSR.png

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const imgUrl = url.searchParams.get('url');
  
  if (!imgUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const fullUrl = imgUrl.startsWith('http') ? imgUrl : `https://hololive-official-cardgame.com${imgUrl}`;

  try {
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://hololive-official-cardgame.com',
      },
    });

    if (!response.ok) {
      return new Response('Image Not Found', { status: 404 });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const imageBuffer = await response.arrayBuffer();

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
