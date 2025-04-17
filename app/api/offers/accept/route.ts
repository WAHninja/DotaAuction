import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { offerId } = await req.json();

    if (!offerId) {
      return NextResponse.json({ error: 'Missing offerId' }, { status: 400 });
    }

    // Step 1: Get the offer
    const offerRes = await db.query(`SELECT * FROM Offers WHERE id = $1`, [offerId]);
    if (offerRes.rows.length === 0) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const offer = offerRes.rows[0];

    // Step 2: Verify that the current user is the target of the offer
    if (offer.target_player_id !== session.user_id) {
      return NextResponse.json({ error: 'Forbidden: Not your offer to accept' }, { status: 403 });
    }

    // Step 3: Mark the selected offer as "accepted"
    await db.query(`UPDATE Offers SET status = 'accepted' WHERE id = $1`, [offerId]);

    // Step 4: Mark other offers for this user and game as "rejected"
    await db.query(
      `UPDATE Offers 
       SET status = 'rejected' 
       WHERE game_id = $1 AND target_player_id = $2 AND id != $3`,
      [offer.game_id, session.user_id, offerId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error accepting offer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
