import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get('id');
  const gameId = Number(idParam);

  if (!idParam || isNaN(gameId)) {
    return NextResponse.json({ message: 'Invalid game ID' }, { status: 400 });
  }

  try {
    const result = await db.query(
      `SELECT * FROM offers WHERE game_id = $1 ORDER BY created_at ASC`,
      [gameId]
    );

    // Strip offer_amount from pending offers server-side.
    // This ensures the exact value is never transmitted to any client until
    // the offer is resolved — it can't be discovered via DevTools or network
    // inspection regardless of what the frontend does with the data.
    const offers = result.rows.map((offer) => ({
      ...offer,
      offer_amount: offer.status === 'pending' ? null : offer.offer_amount,
    }));

    return NextResponse.json({ offers });
  } catch (err) {
    console.error('Error fetching offers:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
