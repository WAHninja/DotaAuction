// app/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { destroySession, getSessionIdFromCookies } from '../../lib/session';
import db from '../../lib/db';

export async function POST(req: NextRequest) {
  const sessionId = await getSessionIdFromCookies();

  if (sessionId) {
    try {
      // Delete session from DB
      await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    } catch (err) {
      console.error('Error deleting session from DB:', err);
    }
  }

  // Destroy cookie and return redirect response with cookie unset
  const response = NextResponse.redirect(new URL('/', req.url));
  destroySession(response); // Make sure this function sets the Set-Cookie header

  return response;
}
