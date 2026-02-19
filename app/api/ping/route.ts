import { NextResponse } from 'next/server';

// Lightweight health-check endpoint used by the client-side keep-alive
// component to prevent Render's free tier from spinning down during play.
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
