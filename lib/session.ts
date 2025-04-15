// lib/session.ts
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

export const SESSION_COOKIE_NAME = 'session_id';

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

  return { sessionId };
}

export function getSession() {
  const cookieStore = cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
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
