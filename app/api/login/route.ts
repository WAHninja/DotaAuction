// app/api/login/route.ts
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '../../../lib/session';
import { randomUUID } from 'crypto';
import db from '../../../lib/db';

export async function POST(req: Request) {
  const data = await req.json();
  const { username, pin } = data;

  const user = await db.user.findFirst({
    where: {
      username,
      pin,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Create session in DB
  const sessionId = randomUUID();
  await db.session.create({
    data: {
      id: sessionId,
      userId: user.id,
    },
  });

  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return res;
}
