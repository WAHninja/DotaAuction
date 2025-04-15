import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import db from './db';

const SESSION_COOKIE_NAME = 'session_id';

export async function createSession(userId: number) {
  const sessionId = randomUUID();

  // Save session in database
  await db.session.create({
    data: {
      id: sessionId,
      userId,
    },
  });

  const response = NextResponse.json({ success: true });

  // Set session cookie
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}

export async function getSessionIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies(); // Await the promise
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  return sessionCookie?.value || null;
}

export async function getSession() {
  const sessionId = getSessionIdFromCookies();
  if (!sessionId) return null;

  const session = await db.session.findUnique({
    where: { id: sessionId },
  });

  return session;
}

export async function destroySession() {
  const sessionId = getSessionIdFromCookies();
  const response = NextResponse.json({ success: true });

  if (sessionId) {
    await db.session.deleteMany({
      where: { id: sessionId },
    });

    // Remove the cookie
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }

  return response;
}
