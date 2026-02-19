import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';

export async function GET(req: NextRequest) {
  // ---- Auth ----------------------------------------------------------------
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
  }

  // ---- Parse game ID -------------------------------------------------------
  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get('id');
  const gameId = Number(idParam);

  if (!idParam || isNaN(gameId)) {
    return NextResponse.json({ message: 'Invalid game ID' }, { status: 400 });
  }

  try {
    // ---- Membership check --------------------------------------------------
    // Verify the caller belongs to the match that contains this game.
    // Without this, any authenticated user could poll offers for any game.
    const membershipRes = await db.query(
      `SELECT 1
       FROM games g
       JOIN match_players mp ON mp.match_id = g.match_id
       WHERE g.id = $1 AND mp.user_id = $2`,
      [gameId, session.userId]
    );

    if (membershipRes.rows.length === 0) {
      return NextResponse.json({ message: 'Not a participant in this match.' }, { status: 403 });
    }

    // ---- Fetch offers -------------------------------------------------------
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
