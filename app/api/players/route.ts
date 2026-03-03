import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import { getSession } from '@/app/session';

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const result = await db.query(
      'SELECT id, username, steam_avatar FROM users ORDER BY username ASC'
    );
    return NextResponse.json({ players: result.rows });
  } catch (error) {
    console.error('Failed to fetch players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}
