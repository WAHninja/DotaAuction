import { NextResponse } from 'next/server';
import db from '../../../lib/db';

export async function GET() {
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
