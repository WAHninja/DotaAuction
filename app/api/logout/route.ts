import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/app/session';

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(`${req.nextUrl.origin}/login`);
  await destroySession(response);
  return response;
}
