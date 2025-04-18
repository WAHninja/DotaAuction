// app/api/match/[id]/accept-offer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const matchId = parseInt(context.params.id);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    const body = await req.json();
    const { offerId, userId } = body;

    if (!offerId || !userId) {
      return NextResponse.json(
        { error: 'Missing offerId or userId' },
        { status: 400 }
      );
    }

    // Optional: validate that offer exists and belongs to the match
    const existing = await db.query(
      `SELECT * FROM offers WHERE id = $1 AND game_id IN (
        SELECT game_id FROM games WHERE match_id = $2
      )`,
      [offerId, matchId]
    );

    if (existing.rowCount === 0) {
      return NextResponse.json(
        { error: 'Offer not found for this match' },
        { status: 404 }
      );
    }

    // Mark offer as accepted (you can customize logic as needed)
    await db.query(
      'UPDATE offers SET status = $1 WHERE id = $2',
      ['accepted', offerId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in accept-offer route:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
