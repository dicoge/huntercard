/**
 * recognize-card.ts — Uses OpenRouter Gemini Vision API to extract card numbers
 * from Hololive TCG card images, then looks up full card data in the database.
 *
 * POST /api/recognize-card
 * Body: { image: "data:image/jpeg;base64,..." }
 * Returns: { success: true, card: { cardNumber, name, sellPrice, series, rarity, imageUrl, prices } }
 *          { success: true, cardNumber, notFound: true, error: "..." }  // card not in DB
 *          { success: false, error: "..." }
 */

export const config = { runtime: 'edge' };

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-3.1-flash-image';
const DATABASE_URL = 'https://huntercard-alpha.vercel.app/data/database.json';

// Module-level cache for database fetch — avoids redundant fetches
let dbFetchPromise: Promise<Record<string, any> | null> | null = null;

/**
 * Fetch and cache the card database JSON.
 * Returns the cards map (keyed by composite ID like "hBP04-005_hBP04").
 */
async function getDatabase(): Promise<Record<string, any> | null> {
  if (dbFetchPromise) return dbFetchPromise;

  dbFetchPromise = (async () => {
    try {
      const res = await fetch(DATABASE_URL);
      if (!res.ok) { dbFetchPromise = null; return null; }
      const data = await res.json();
      return data?.cards || null;
    } catch {
      dbFetchPromise = null; // reset so next call retries
      return null;
    }
  })();

  return dbFetchPromise;
}

const SYSTEM_PROMPT = `You are a card number extractor for Hololive Trading Card Game (Hololive TCG).
Look at the card image and extract ONLY the card number printed on it.
Hololive TCG card numbers look like: hBP01-001, hSD02-003, hPR-002, BP04-005, NP04-005, etc.
Reply with ONLY the card number — no explanation, no extra text, no quotes.
If you cannot see a card number, reply with: ERROR`;

/**
 * Validate and normalize a raw card number string
 */
function normalizeCardNumber(raw: string): string | null {
  let cleaned = raw.trim();
  // Strip quotes, backticks, periods
  cleaned = cleaned.replace(/^['"`\s]+|['"`\s]+$/g, '');
  cleaned = cleaned.replace(/\.$/, '');
  cleaned = cleaned.toLowerCase();

  // Normalize prefix aliases
  const prefixMap: Record<string, string> = {
    np: 'hbp', bp: 'hbp', sd: 'hsd', pr: 'hpr',
    sp: 'hsp', ocg: 'hocg', pc: 'hpc', cs: 'hcs',
    co: 'hco', wf: 'hwf', ys: 'hys', ent: 'hent',
  };

  // Match patterns like hBP04-005, BP04-005, NP04-005
  // Also handles trailing rarity text like "hBP01-001 SEC" or "hBP04-005 C"
  const match = cleaned.match(/(h?[a-z]{2,3}\d{0,2}[-\s]?\d{1,3})/i);
  if (!match) return null;

  let result = match[1];
  // Normalize spaces to hyphens (e.g. "hBP04 005" → "hBP04-005")
  result = result.replace(/[-\s]/g, '-');
  // Ensure hyphen — only if not already present
  if (!result.includes('-')) {
    result = result.replace(/(\d)(\d{2,3})$/, '$1-$2');
  }
  // Add 'h' prefix if missing, with alias
  if (!result.startsWith('h')) {
    const prefix = result.substring(0, 2);
    const rest = result.substring(2);
    if (prefixMap[prefix]) {
      result = prefixMap[prefix] + rest;
    } else {
      result = 'h' + result;
    }
  }

  return result;
}

function jsonResponse(data: any, status = 200): Response {
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  // Check API key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return jsonResponse({ success: false, error: 'Server configuration error: API key not set' }, 500);
  }

  try {
    // Parse request body
    const body = await req.json();
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return jsonResponse({ success: false, error: 'Missing or invalid image field' }, 400);
    }

    // Accept both data URIs and raw base64
    const imageData = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

    // Call OpenRouter Gemini Vision API
    const orResponse = await fetch(OPENROUTER_URL, {
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
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract the card number from this Hololive TCG card:' },
              { type: 'image_url', image_url: { url: imageData } },
            ],
          },
        ],
        max_tokens: 30,
        temperature: 0.0,
      }),
    });

    // Handle OpenRouter errors
    if (!orResponse.ok) {
      const errorText = await orResponse.text();
      let errorDetail = `OpenRouter HTTP ${orResponse.status}`;
      try {
        const errJson = JSON.parse(errorText);
        errorDetail = errJson?.error?.message || errJson?.error || errorDetail;
      } catch {
        errorDetail += `: ${errorText.slice(0, 300)}`;
      }
      return jsonResponse({ success: false, error: errorDetail }, 502);
    }

    // Parse OpenRouter response
    const orData = await orResponse.json();
    const rawText = orData?.choices?.[0]?.message?.content?.trim() || '';

    // If Gemini couldn't find a card number
    if (!rawText || rawText === 'ERROR' || rawText.includes('ERROR')) {
      return jsonResponse({
        success: false,
        error: 'Could not detect a card number in this image. Please ensure the card is well-lit and fully visible.',
      }, 422);
    }

    // Normalize and validate the card number
    const cardNumber = normalizeCardNumber(rawText);
    if (!cardNumber) {
      return jsonResponse({
        success: false,
        error: `Detected text "${rawText}" is not a valid card number format.`,
        raw: rawText,
      }, 422);
    }

    // Look up card in database
    const cards = await getDatabase();
    if (!cards) {
      // Database unavailable — still return cardNumber so frontend can proceed with partial data
      return jsonResponse({ success: true, cardNumber, dbUnavailable: true });
    }

    // Find the card by matching cardNumber case-insensitively
    const cardKey = Object.keys(cards).find(
      (k) => cards[k].cardNumber?.toLowerCase() === cardNumber,
    );
    const match = cardKey ? cards[cardKey] : null;

    if (!match) {
      return jsonResponse({
        success: true,
        cardNumber,
        notFound: true,
        error: `卡號 ${cardNumber} 未在資料庫中`,
      });
    }

    // Success with full card data
    return jsonResponse({
      success: true,
      card: {
        cardNumber: match.cardNumber,
        name: match.name,
        sellPrice: match.sellPrice,
        series: match.series,
        rarity: match.rarity,
        imageUrl: match.officialImage || '',
        prices: match.prices,
      },
    });
  } catch (e: any) {
    return jsonResponse({ success: false, error: `Internal error: ${e.message}` }, 500);
  }
}
