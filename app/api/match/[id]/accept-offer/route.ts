import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const matchId = parseInt(params.id);
  if (isNaN(matchId)) {
    return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
  }

  const { offerId } = await req.json();
  if (!offerId) {
    return NextResponse.json({ error: 'Missing offer ID' }, { status: 400 });
  }

  try {
    // Check if this offer exists and is for this match
    const offerRes = await db.query(
      `SELECT o.*, g.game_id, g.status
       FROM Offers o
       JOIN Games g ON o.game_id = g.game_id
       WHERE o.id = $1 AND g.match_id = $2`,
      [offerId, matchId]
    );

    if (offerRes.rows.length === 0) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const offer = offerRes.rows[0];

    if (offer.target_player_id !== session.playerId) {
      return NextResponse.json({ error: 'You are not the target of this offer' }, { status: 403 });
    }

    if (offer.accepted) {
      return NextResponse.json({ error: 'Offer already accepted' }, { status: 400 });
    }

    if (offer.status !== 'Auction pending') {
      return NextResponse.json({ error: 'Auction is not active' }, { status: 400 });
    }

    // Check if the player has already accepted an offer in this game
    const alreadyAccepted = await db.query(
      `SELECT 1 FROM Offers
       WHERE game_id = $1 AND target_player_id = $2 AND accepted = true`,
      [offer.game_id, session.playerId]
    );

    if (alreadyAccepted.rows.length > 0) {
      return NextResponse.json({ error: 'You already accepted an offer' }, { status: 400 });
    }

    // Do gold transfer and mark accepted
    await db.query('BEGIN');

    await db.query(
      `UPDATE MatchPlayers SET gold = gold - $1 WHERE match_id = $2 AND player_id = $3`,
      [offer.amount, matchId, offer.from_player_id]
    );

    await db.query(
      `UPDATE MatchPlayers SET gold = gold + $1 WHERE match_id = $2 AND player_id = $3`,
      [offer.amount, matchId, offer.target_player_id]
    );

    await db.query(
      `UPDATE Offers SET accepted = true WHERE id = $1`,
      [offer.id]
    );

    await db.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error accepting offer:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
