// lib/session.ts
import { cookies as getCookies } from 'next/headers';
import { randomUUID } from 'crypto';

export const SESSION_COOKIE_NAME = 'session_id';

export function getSessionIdFromCookies(cookieStore: ReturnType<typeof getCookies>) {
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}
