// recognize-card.ts — OpenRouter Gemini Vision API
export const config = { runtime: 'edge' };

const MODEL = 'google/gemini-3.1-flash-image';
const PROMPT = 'Extract the card number from this hololive TCG card. Reply ONLY the card number (e.g. hBP04-001).';

function validateCardNumber(raw: string): string | null {
  let c = raw.trim().toLowerCase().replace(/^["'\s]+|["'\s]+$/g, '');
  return /^h?(bp|sd|pr|bd|y)\d{0,2}(-\d{2,3})?$/.test(c) ? c : null;
}

function jsonRes(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  if (req.method !== 'POST') return jsonRes({ success: false, error: 'Method not allowed' }, 405);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return jsonRes({ success: false, error: 'API key not configured' }, 500);

  try {
    const { image } = await req.json() as any;
    if (!image?.startsWith?.('data:image/')) {
      return jsonRes({ success: false, error: 'Invalid image' }, 400);
    }

    // Pass API key as query param to avoid edge runtime header stripping
    const url = `https://openrouter.ai/api/v1/chat/completions?api_key=${encodeURIComponent(apiKey)}`;

    const orRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://huntercard-alpha.vercel.app',
        'X-Title': 'HunterCard',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: image } },
          ],
        }],
        max_tokens: 50,
        temperature: 0.1,
      }),
    });

    if (!orRes.ok) {
      const err = await orRes.text();
      return jsonRes({ success: false, error: `OR ${orRes.status}: ${err.slice(0, 200)}` }, 502);
    }

    const data = await orRes.json() as any;
    const rawText = (data?.choices?.[0]?.message?.content || '').trim();
    const cardNumber = validateCardNumber(rawText);
    if (!cardNumber) return jsonRes({ success: false, error: `Parse: "${rawText}"` }, 422);

    return jsonRes({ success: true, cardNumber });
  } catch (e: any) {
    return jsonRes({ success: false, error: `Err: ${e.message}` }, 500);
  }
}