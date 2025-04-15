// lib/session.ts
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const SESSION_COOKIE_NAME = 'session_id';

export function createSession(userId: number) {
  const sessionId = randomUUID();
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  // Store session in database
  return { sessionId };
}

export function getSession() {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return sessionId;
}

export function destroySession() {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
