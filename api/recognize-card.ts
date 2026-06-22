// recognize-card.ts — Uses OpenRouter Gemini Vision API to recognize card numbers
// POST /api/recognize-card

export const config = { runtime: 'edge' };

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-3.1-flash-image';
const PROMPT = 'Extract the card number from this hololive TCG card image. Reply with ONLY the card number (e.g. hBP04-001 or BP04-001).';

function validateCardNumber(raw: string): string | null {
  let cleaned = raw.trim().toLowerCase();
  cleaned = cleaned.replace(/^["'\s]+|["'\s]+$/g, '');
  if (!/^h?(bp|sd|pr|bd|y)\d{0,2}(-\d{2,3})?$/.test(cleaned)) return null;
  return cleaned;
}

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return json({ success: false, error: 'API key not configured' }, 500);

  try {
    const body = await req.json();
    const { image } = body;
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return json({ success: false, error: 'Invalid image' }, 400);
    }

    // Call OpenRouter
    const orRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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
      const errText = await orRes.text();
      return json({ success: false, error: `OpenRouter ${orRes.status}: ${errText.slice(0, 200)}` }, 502);
    }

    const data = await orRes.json();
    const rawText = data?.choices?.[0]?.message?.content?.trim() || '';
    const cardNumber = validateCardNumber(rawText);

    if (!cardNumber) {
      return json({ success: false, error: `Could not parse: "${rawText}"` }, 422);
    }

    return json({ success: true, cardNumber });
  } catch (e: any) {
    return json({ success: false, error: `Error: ${e.message}` }, 500);
  }
}