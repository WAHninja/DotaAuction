// app/api/game/[id]/offers/route.ts

import { NextRequest } from 'next/server';
import db from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const gameId = Number(params.id);
  if (isNaN(gameId)) {
    return new Response(JSON.stringify({ message: 'Invalid game ID' }), { status: 400 });
  }

  try {
    const result = await db.query(`
      SELECT *
      FROM offers
      WHERE game_id = $1
      ORDER BY created_at ASC
    `, [gameId]);

    return new Response(JSON.stringify({ offers: result.rows }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error fetching offers:', err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
}
