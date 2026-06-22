// recognize-card.ts — Uses OpenRouter Gemini Vision API to recognize card numbers from uploaded card images
// POST /api/recognize-card
// Request: { image: "data:image/png;base64,<base64 data>" }
// Response: { success: true, cardNumber: "hbp04-001" } | { success: false, error: "..." }

import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { runtime: 'nodejs' };

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-3.1-flash-image';
const PROMPT = 'Extract the card number from this hololive TCG card image. Reply with ONLY the card number (e.g. hBP04-001 or BP04-001).';

function validateCardNumber(raw: string): string | null {
  let cleaned = raw.trim().toLowerCase();
  cleaned = cleaned.replace(/^["'\s]+|["'\s]+$/g, '');

  if (!/^h?(bp|sd|pr|bd|y)\d{0,2}(-\d{2,3})?$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { image } = req.body || {};

    if (!image || typeof image !== 'string') {
      console.error('[recognize-card] Missing or invalid image field');
      return res.status(400).json({ success: false, error: 'Missing image field (base64 data URI required)' });
    }

    if (!image.startsWith('data:image/')) {
      console.error('[recognize-card] Image field is not a valid data URI');
      return res.status(400).json({ success: false, error: 'Image must be a base64 data URI (data:image/...)' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('[recognize-card] OPENROUTER_API_KEY not set');
      return res.status(500).json({ success: false, error: 'Server configuration error: API key not set' });
    }

    console.log('[recognize-card] Calling OpenRouter Gemini Vision API...');

    const openRouterResponse = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://huntercard-alpha.vercel.app',
        'X-Title': 'HunterCard',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 50,
        temperature: 0.1,
      }),
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error(`[recognize-card] OpenRouter API error ${openRouterResponse.status}: ${errorText}`);
      return res.status(502).json({ success: false, error: 'Card recognition service unavailable' });
    }

    const data = await openRouterResponse.json();
    const rawText = data?.choices?.[0]?.message?.content?.trim();

    if (!rawText) {
      console.error('[recognize-card] Empty response from OpenRouter');
      return res.status(422).json({ success: false, error: 'Could not recognize card number' });
    }

    console.log(`[recognize-card] Raw response: "${rawText}"`);

    const cardNumber = validateCardNumber(rawText);

    if (!cardNumber) {
      console.error(`[recognize-card] Response did not match card number pattern: "${rawText}"`);
      return res.status(422).json({ success: false, error: 'Could not recognize card number' });
    }

    console.log(`[recognize-card] Recognized card: ${cardNumber}`);

    return res.status(200).json({ success: true, cardNumber });
  } catch (e: any) {
    console.error('[recognize-card] Unexpected error:', e.message);
    return res.status(500).json({ success: false, error: e.message || 'Could not recognize card number' });
  }
}