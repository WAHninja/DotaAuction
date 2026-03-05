import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import db from '@/lib/db';

const SESSION_COOKIE_NAME = 'session_id';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

// Strict UUID v4 pattern — enforces exact structure (8-4-4-4-12) as well as
// the version nibble (4) and variant bits ([89ab]) that randomUUID() always
// produces. The previous pattern /^[0-9a-fA-F-]{36}$/ only checked character
// set and total length, so structurally invalid strings like
// "------------------------------------" or "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
// (no hyphens) would pass silently.
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
export async function getSessionIdFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie || !UUID_V4_REGEX.test(sessionCookie.value)) {
      return null;
    }

    return sessionCookie.value;
  } catch (error) {
    console.error('Error reading session cookie:', error);
    return null;
  }
}

// ------------------ Get Session ------------------
export async function getSession() {
  const sessionId = await getSessionIdFromCookies();
  if (!sessionId) return null;

  try {
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
  } catch (error) {
    console.error('Error fetching session from DB:', error);
    return null;
  }
}

// ------------------ Destroy Session ------------------
export async function destroySession(response?: NextResponse) {
  const sessionId = await getSessionIdFromCookies();
  if (!sessionId) return;

  try {
    await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
  } catch (error) {
    console.error('Error deleting session from DB:', error);
  }

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
