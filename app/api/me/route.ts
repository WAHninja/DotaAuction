import { NextRequest, NextResponse } from 'next/server';
import { getSessionIdFromCookies } from '@/app/session';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const sessionId = await getSessionIdFromCookies(req);

  if (!sessionId) {
    return NextResponse.json({ user: null });
  }

  try {
    const result = await db.query(
      `
      SELECT users.id, users.username
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.id = $1
      LIMIT 1
      `,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ user: null });
    }

    const user = result.rows[0];
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user from session:', error);
    return NextResponse.json({ user: null });
  }
}
