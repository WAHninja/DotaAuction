import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import db from '../../lib/db';
import { SESSION_COOKIE_NAME } from '../../lib/session';

export async function POST() {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    await db.session.delete({ where: { id: sessionId } });
  }

  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return NextResponse.json({ success: true });
}
