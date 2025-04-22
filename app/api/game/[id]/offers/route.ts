// app/api/game/[id]/offers/route.ts

import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  const gameId = Number(context.params.id);
  if (isNaN(gameId)) {
    return NextResponse.json({ message: 'Invalid game ID' }, { status: 400 });
  }

  try {
    const result = await db.query(`
      SELECT *
      FROM offers
      WHERE game_id = $1
      ORDER BY created_at ASC
    `, [gameId]);

    return NextResponse.json({ offers: result.rows });
  } catch (err) {
    console.error('Error fetching offers:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
