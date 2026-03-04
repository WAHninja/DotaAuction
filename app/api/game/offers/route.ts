import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';

export async function GET(req: NextRequest) {
  // ---- Auth ----------------------------------------------------------------
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  // ---- Parse + validate game ID -------------------------------------------
  // Number() is too permissive — Number("1.5") and Number("0") both pass
  // isNaN() but are not valid integer IDs. We require a positive integer.
  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get('id');
  const gameId  = Number(idParam);

  if (!idParam || !Number.isInteger(gameId) || gameId <= 0) {
    return NextResponse.json({ error: 'Invalid game ID.' }, { status: 400 });
  }

  try {
    // ---- Run membership check + offers fetch in parallel ------------------
    // The two queries have no dependency on each other at the DB level —
    // whether game_id = X has offers is entirely independent of whether
    // session.userId is a participant in that game's match. Firing both
    // together saves a full sequential round-trip on the success path
    // (the common case). If membership fails we discard the offers result.
    const [membershipRes, offersRes] = await Promise.all([

      // Membership check — does this user belong to the match for this game?
      // LIMIT 1 stops Postgres scanning for further matches once it finds the
      // first. The JOIN can produce multiple rows without it (one per game in
      // the match) even though we only care about existence.
      db.query(
        `SELECT 1
         FROM games g
         JOIN match_players mp ON mp.match_id = g.match_id
         WHERE g.id = $1
           AND mp.user_id = $2
         LIMIT 1`,
        [gameId, session.userId]
      ),

      // Offers fetch — explicit columns rather than SELECT *.
      // offer_amount is stripped at the SQL layer for pending offers so the
      // raw value never enters the JS layer at all. This is consistent with
      // how every other route in the codebase handles pending offer amounts
      // (submit-offer, match/[id], and the history route all use the same
      // CASE WHEN pattern).
      db.query(
        `SELECT
           id,
           game_id,
           from_player_id,
           target_player_id,
           CASE WHEN status = 'pending' THEN NULL ELSE offer_amount END AS offer_amount,
           tier_label,
           status,
           created_at
         FROM offers
         WHERE game_id = $1
         ORDER BY created_at ASC`,
        [gameId]
      ),
    ]);

    // ---- Authorise --------------------------------------------------------
    // Check membership result after both queries have resolved. If the user
    // is not a participant we return 403 without sending the offers data.
    if (membershipRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Not a participant in this match.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ offers: offersRes.rows });

  } catch (err) {
    console.error('[OFFERS_GET_ERROR]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
