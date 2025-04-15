import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { generateSessionId, SESSION_COOKIE_NAME } from '../../../lib/session';
import db from '../../../lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const { username, pin } = await req.json();

  const user = await db.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(pin, user.pin))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const sessionId = generateSessionId();
  await db.session.create({
    data: {
      id: sessionId,
      userId: user.id,
    },
  });

  const cookieStore = cookies(); // No need to await this unless you use edge runtime
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ success: true });
}
