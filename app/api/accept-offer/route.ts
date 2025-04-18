import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, offerId, userId } = body;

    if (!matchId || !offerId || !userId) {
      return NextResponse.json(
        { error: 'Missing matchId, offerId, or userId' },
        { status: 400 }
      );
    }

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

    await db.query(
      'UPDATE offers SET status = $1 WHERE id = $2',
      ['accepted', offerId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Accept Offer API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
