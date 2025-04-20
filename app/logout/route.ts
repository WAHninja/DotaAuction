// app/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/app/session';

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/', req.url));

  await destroySession(response); // Clears session cookie + removes from DB

  return response;
}
