import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import db from '@/lib/db';

const SESSION_COOKIE_NAME = 'session_id';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

// ------------------ Create Session ------------------
export async function createSession(userId: number) {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.query(
    'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES ($1, $2, NOW(), $3)',
    [sessionId, userId, expiresAt]
  );

  const response = NextResponse.json({ success: true });

  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return response;
}

// ------------------ Get Session ID ------------------
export function getSessionIdFromCookies(): string | null {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  return sessionCookie?.value ?? null;
}

// ------------------ Get Session ------------------
export async function getSession() {
  const sessionId = getSessionIdFromCookies();
  if (!sessionId) return null;

  const result = await db.query(
    'SELECT * FROM sessions WHERE id = $1 AND expires_at > NOW() LIMIT 1',
    [sessionId]
  );

  const session = result.rows[0];
  if (!session) return null;

  return {
    id: session.id,
    userId: session.user_id,
    createdAt: session.created_at,
    expiresAt: session.expires_at,
  };
}

// ------------------ Destroy Session ------------------
export async function destroySession(response?: NextResponse) {
  const sessionId = getSessionIdFromCookies();
  if (!sessionId) return;

  await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);

  if (response) {
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }
}
