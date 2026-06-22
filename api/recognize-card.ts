// test-env.ts
export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const key = process.env.OPENROUTER_API_KEY || '';
  const prefix = key ? key.substring(0, 12) + '...' : 'EMPTY';
  return new Response(JSON.stringify({
    hasKey: !!key,
    keyLen: key.length,
    keyPrefix: prefix,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}