// app/logout/route.ts
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '../../../lib/session';
import { cookies } from 'next/headers';
import db from '../../../lib/db';

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    await db.session.deleteMany({
      where: { id: sessionId },
    });
  }

  const res = NextResponse.redirect('/');
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return res;
}
