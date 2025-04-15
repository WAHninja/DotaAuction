import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import db from './db';

const SESSION_COOKIE_NAME = 'session_id';

export async function createSession(userId: number) {
  const sessionId = randomUUID();

  // Save session in database
  await db.query(
    'INSERT INTO sessions (id, user_id, created_at) VALUES ($1, $2, NOW())',
    [sessionId, userId]
  );

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
  const cookieStore = cookies(); // ← cookies() is sync in App Router
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  return sessionCookie?.value || null;
}

export async function getSession() {
  const sessionId = await getSessionIdFromCookies();
  if (!sessionId) return null;

  const result = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
  return result.rows[0] || null;
}

export async function destroySession() {
  const sessionId = await getSessionIdFromCookies();
  const response = NextResponse.json({ success: true });

  if (sessionId) {
    await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);

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
