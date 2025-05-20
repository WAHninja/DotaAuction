import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/app/session';

export async function POST(req: NextRequest) {
  const base = process.env.NODE_ENV === 'production'
    ? process.env.RENDER_EXTERNAL_URL    // e.g. https://dotaauction.onrender.com
    : req.nextUrl.origin;

  const response = NextResponse.redirect(`${base}/login`);
  await destroySession(response); // This must run BEFORE return
  return response;
}
