import { randomUUID } from 'crypto';
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

export const SESSION_COOKIE_NAME = 'session_id';

export function generateSessionId() {
  return randomUUID();
}

export function getSessionIdFromCookies(cookies: ReadonlyRequestCookies) {
  return cookies.get(SESSION_COOKIE_NAME)?.value || null;
}
