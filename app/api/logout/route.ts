import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/app/session';

export async function POST(req: NextRequest) {
  const base = process.env.NODE_ENV === 'production'
    ? process.env.RENDER_EXTERNAL_URL
    : `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const response = NextResponse.redirect(`${base}/login`);
  await destroySession(response);
  return response;
}
