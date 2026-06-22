// recognize-card.ts — Uses OpenRouter Gemini Vision API to recognize card numbers
// POST /api/recognize-card
// Edge Runtime — same pattern as image.ts

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

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders(),
    });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ success: false, error: 'API key not configured' }), {
      status: 500, headers: corsHeaders(),
    });
  }

  try {
    const body = await req.json();
    const { image } = body;

    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or missing image' }), {
        status: 400, headers: corsHeaders(),
      });
    }

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
      const err = await orRes.text();
      return new Response(JSON.stringify({ success: false, error: 'Recognition unavailable' }), {
        status: 502, headers: corsHeaders(),
      });
    }

    const data = await orRes.json();
    const rawText = data?.choices?.[0]?.message?.content?.trim() || '';
    const cardNumber = validateCardNumber(rawText);

    if (!cardNumber) {
      return new Response(JSON.stringify({ success: false, error: 'Format error' }), {
        status: 422, headers: corsHeaders(),
      });
    }

    return new Response(JSON.stringify({ success: true, cardNumber }), {
      status: 200, headers: corsHeaders(),
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: corsHeaders(),
    });
  }
}