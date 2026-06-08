// Simplest possible Vercel function
export const config = { runtime: 'nodejs' };

export default async function handler(req: Request) {
  return Response.json({ status: 'ok', method: req.method, time: Date.now() });
}