// Vercel Serverless Function test
export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  return new Response(JSON.stringify({
    success: true,
    ts: Date.now(),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}