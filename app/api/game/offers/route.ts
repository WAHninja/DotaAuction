// app/api/game/offers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    const gameId = Number(idParam);

    if (!idParam || isNaN(gameId)) {
      return NextResponse.json({ message: 'Invalid game ID' }, { status: 400 });
    }

    // Fetch all offers for this game, ordered by creation time
    const { rows } = await db.query(
      `SELECT id, from_player_id, target_player_id, offer_amount, status
       FROM Offers
       WHERE game_id = $1
       ORDER BY created_at ASC`,
      [gameId]
    );

    return NextResponse.json({ offers: rows });
  } catch (err) {
    console.error('Error fetching offers:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
