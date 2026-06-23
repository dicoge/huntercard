/**
 * recognize-card.ts — Uses OpenRouter Gemini Vision API to identify Hololive TCG cards.
 * @cache-buster 20260623-v1
 *
 * Two strategies:
 *   Strat 1: Read the tiny card number (e.g. hBP01-001)
 *   Strat 2: If no card number, identify by card text/character name
 *
 * POST /api/recognize-card
 * Body: { image: "data:image/jpeg;base64,..." }
 */

export const config = { runtime: 'edge' };

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-3.1-flash-image';
const DATABASE_URL = 'https://huntercard-alpha.vercel.app/data/database.json';

let dbFetchPromise: Promise<Record<string, any> | null> | null = null;

async function getDatabase(): Promise<Record<string, any> | null> {
  if (dbFetchPromise) return dbFetchPromise;
  dbFetchPromise = (async () => {
    try {
      const res = await fetch(DATABASE_URL);
      if (!res.ok) { dbFetchPromise = null; return null; }
      return (await res.json())?.cards || null;
    } catch {
      dbFetchPromise = null;
      return null;
    }
  })();
  return dbFetchPromise;
}

// ── Card number extraction ──
const prefixMap: Record<string, string> = {
  np: 'hbp', bp: 'hbp', sd: 'hsd', pr: 'hpr',
  sp: 'hsp', ocg: 'hocg', pc: 'hpc', cs: 'hcs',
  co: 'hco', wf: 'hwf', ys: 'hys', ent: 'hent',
};

function normalizeCardNumber(raw: string): string | null {
  let cleaned = raw.trim().replace(/^['"`\s]+|['"`\s]+$/g, '').replace(/\.$/, '').toLowerCase();
  const m = cleaned.match(/(h?[a-z]{2,3}\d{0,2}[-\s]?\d{1,3})/i);
  if (!m) return null;
  let r = m[1].replace(/[-\s]/g, '-');
  if (!r.includes('-')) r = r.replace(/(\d)(\d{2,3})$/, '$1-$2');
  if (!r.startsWith('h')) {
    const p = r.slice(0, 2), rest = r.slice(2);
    r = (prefixMap[p] || 'h' + p) + rest;
  }
  return r;
}

// ── Name-based search ──
function searchByName(cards: Record<string, any>, keywords: string[]): any {
  let best: any = null;
  let bestScore = 0;

  for (const entry of Object.values(cards) as any[]) {
    const name: string = (entry.name || '').toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (name.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return bestScore >= 1 ? best : null;
}

function json(d: any, status = 200): Response {
  return new Response(JSON.stringify(d), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    },
  });
}

function fmt(entry: any) {
  // For SEC/highest-rarity cards, use the top price from prices array
  let price = entry.sellPrice;
  if (entry.rarity === 'SEC' && entry.prices?.length > 0) {
    price = Math.max(...entry.prices.map((p: any) => p.sellPrice || 0));
  }
  return {
    cardNumber: entry.cardNumber,
    name: entry.name,
    sellPrice: price,
    series: entry.series,
    rarity: entry.rarity,
    imageUrl: entry.officialImage || '',
    prices: entry.prices,
  };
}

// ── Main handler ──
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return json({ success: false, error: 'API key not set' }, 500);

  try {
    const body = await req.json();
    const { image } = body;
    if (!image || typeof image !== 'string') return json({ success: false, error: 'Invalid image' }, 400);
    const imageData = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

    // ── Gemini call: extract ALL card info ──
    const geminiPrompt = `You are analyzing a Hololive TCG card. Extract info from the card itself (ignore phone UI overlay).

First try to find:
- CHARACTER NAME (e.g. ときのそら, ラプラス・ダークネス, 紫咲シオン)
- CARD TITLE / SET NAME (e.g. 総帥のお仕事, 秘密結社holoX)
- Any other text printed on the card

Then try to find the CARD NUMBER (tiny text like hBP01-001, hSD02-003 at bottom edge).
BUT if you are not 100% sure of the card number, say NONE for the number.
It's better to say NONE than guess the wrong number.

Reply in this format:
CHARACTER: [character name from the card, or NONE]
TITLE: [card title/set name, or NONE]
CARD_NUMBER: [exact card number if 100% certain, otherwise NONE]`;

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
        messages: [
          { role: 'system', content: geminiPrompt },
          { role: 'user', content: [
            { type: 'text', text: 'Identify this Hololive TCG card.' },
            { type: 'image_url', image_url: { url: imageData } },
          ]},
        ],
        max_tokens: 150,
        temperature: 0.0,
      }),
    });

    if (!orRes.ok) {
      const err = await orRes.text();
      return json({ success: false, error: `Gemini error (${orRes.status})` }, 502);
    }

    const orData = await orRes.json();
    const reply = (orData?.choices?.[0]?.message?.content || '').trim();
    if (!reply) {
      // Debug: include partial response even when empty
      return json({ success: false, error: 'Gemini returned empty response', debug: { status: orRes.status, model: MODEL } }, 502);
    }

    // Parse Gemini's response
    const cnMatch = reply.match(/CARD_NUMBER:\s*(.+)/i);
    const charMatch = reply.match(/CHARACTER:\s*(.+)/i);
    const titleMatch = reply.match(/TITLE:\s*(.+)/i);

    const cardNumberRaw = cnMatch ? cnMatch[1].trim() : 'NONE';
    const characterName = charMatch ? charMatch[1].trim() : '';
    const cardTitle = titleMatch ? titleMatch[1].trim() : '';

    const cards = await getDatabase();

    // ── Try name/character match FIRST (more reliable on blurry phone photos) ──
    if (cards && (characterName || cardTitle)) {
      const searchText = `${characterName} ${cardTitle}`.toLowerCase();
      const keywords = searchText
        .replace(/[（(][^)）]*[)）]/g, '')
        .split(/[\s,，、・]+/)
        .filter(k => k.length >= 2 && !/^\d+$/.test(k));

      let bestEntry: any = null;
      let bestScore = 0;
      const charLower = characterName.toLowerCase().replace(/[^a-z0-9ぁ-んァ-ヶー一-龠]/g, '');

      for (const entry of Object.values(cards) as any[]) {
        const name: string = (entry.name || '').toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          if (name.includes(kw)) score += 1;
        }
        const nameNorm = name.replace(/[^a-z0-9ぁ-んァ-ヶー一-龠]/g, '');
        if (charLower && nameNorm.includes(charLower)) score += 3;
        if (score > bestScore) { bestScore = score; bestEntry = entry; }
        else if (score === bestScore && bestEntry) {
          // Tiebreaker: prefer entry where series matches cardNumber prefix (original printing)
          const prefix = (entry.cardNumber || '').split('-')[0].toLowerCase();
          const bestPrefix = (bestEntry.cardNumber || '').split('-')[0].toLowerCase();
          const entryIsOriginal = entry.series?.toLowerCase() === prefix;
          const bestIsOriginal = bestEntry.series?.toLowerCase() === bestPrefix;
          if (entryIsOriginal && !bestIsOriginal) { bestEntry = entry; }
          else if (!entryIsOriginal && !bestIsOriginal && entry.series !== 'hpr' && bestEntry.series === 'hpr') {
            bestEntry = entry;
          }
        }
      }

      if (bestEntry && bestScore >= 1) {
        // If Gemini also returned a card number, see if there's a card matching BOTH name and number
        if (cardNumberRaw !== 'NONE' && cardNumberRaw !== '') {
          const exactNum = normalizeCardNumber(cardNumberRaw);
          if (exactNum) {
            const exactMatch = Object.values(cards).find(
              (e: any) => e.cardNumber?.toLowerCase() === exactNum
            );
            if (exactMatch) {
              // Verify: the exact match should also match the name (same character)
              const exactName = (exactMatch.name || '').toLowerCase();
              const exactNameNorm = exactName.replace(/[^a-z0-9ぁ-んァ-ヶー一-龠]/g, '');
              if (charLower && exactNameNorm.includes(charLower)) {
                return json({ success: true, card: fmt(exactMatch), matchMethod: 'name+number' });
              }
            }
          }
        }

        // Find all entries with this card number, prefer the one where series matches cardNumber prefix
        const allV = Object.values(cards).filter((e: any) => e.cardNumber === bestEntry.cardNumber) as any[];
        const best = allV.find((e: any) => {
          const prefix = (e.cardNumber || '').split('-')[0].toLowerCase();
          return e.series?.toLowerCase() === prefix;
        }) || allV.find((e: any) => e.series?.toLowerCase() !== 'hpr') || bestEntry;
        return json({ success: true, card: fmt(best), matchMethod: 'name' });
      }
    }

    // ── Try card number match ──
    if (cardNumberRaw !== 'NONE' && cardNumberRaw !== '') {
      const cardNumber = normalizeCardNumber(cardNumberRaw);
      if (cardNumber && cards) {
        const key = Object.keys(cards).find(
          k => (cards[k] as any).cardNumber?.toLowerCase() === cardNumber
        );
        if (key) return json({ success: true, card: fmt(cards[key]) });
      }
    }

// Both strategies failed
    return json({ success: false, error: '無法辨識此卡牌', raw: reply }, 404);
  } catch (e: any) {
    return json({ success: false, error: `Error: ${e.message}` }, 500);
  }
}