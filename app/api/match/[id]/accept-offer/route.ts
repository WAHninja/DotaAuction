// app/api/match/[id]/accept-offer/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = parseInt(params.id);
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

    // Validate the offer belongs to the match
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

    // Accept the offer
    await db.query(
      'UPDATE offers SET status = $1 WHERE id = $2',
      ['accepted', offerId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in accept-offer route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
