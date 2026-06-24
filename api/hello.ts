/**
 * Simple test endpoint to verify Vercel function deployment
 */
export const config = { runtime: 'nodejs' };
export const maxDuration = 10;

export default async function handler(req: Request): Promise<Response> {
  return new Response(JSON.stringify({
    success: true,
    message: 'API function is working!',
    env: {
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}