import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ---- Auth ----------------------------------------------------------------
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  const currentUserId = session.userId;

  // ---- Validate route param ------------------------------------------------
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return NextResponse.json({ error: 'Invalid match ID.' }, { status: 400 });
  }

  try {
    // ---- Parallel fetch: match row, players, games -------------------------
    //
    // All three depend only on matchId, which is known before any query runs.
    // Previously four sequential queries; now three concurrent round-trips
    // whose total wall time equals the slowest of the three.
    //
    // The membership check was a separate fifth query — it's folded into the
    // players fetch below: if currentUserId isn't in the returned player rows,
    // the caller is not a participant, and we return 403 without an extra trip.
    //
    // SELECT * on matches and games has been replaced with explicit column
    // lists so future schema additions don't silently appear in the response.
    const [matchRes, playersRes, gamesRes] = await Promise.all([
      db.query<{
        id: number;
        status: string;
        winner_id: number | null;
        created_at: string;
      }>(
        `SELECT id, status, winner_id, created_at
         FROM matches
         WHERE id = $1`,
        [matchId]
      ),

      db.query<{
        id: number;
        username: string;
        gold: number;
        steam_avatar: string | null;
      }>(
        `SELECT u.id, u.username, mp.gold, u.steam_avatar
         FROM match_players mp
         JOIN users u ON mp.user_id = u.id
         WHERE mp.match_id = $1`,
        [matchId]
      ),

      db.query<{
        id: number;
        match_id: number;
        status: string;
        winning_team: string | null;
        team_1_members: number[];
        team_a_members: number[];
        created_at: string;
      }>(
        `SELECT id, match_id, status, winning_team, team_1_members, team_a_members, created_at
         FROM games
         WHERE match_id = $1
         ORDER BY id ASC`,
        [matchId]
      ),
    ]);

    // ---- Existence + membership checks -------------------------------------
    if (matchRes.rowCount === 0) {
      return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
    }

    // Membership check folded into the players result — no separate query
    // needed. Without this, any authenticated user could enumerate team
    // compositions, gold balances, and offers for arbitrary matches by
    // iterating match IDs.
    const players = playersRes.rows;
    const isMember = players.some(p => p.id === currentUserId);
    if (!isMember) {
      return NextResponse.json(
        { error: 'Not a participant in this match.' },
        { status: 403 }
      );
    }

    const match  = matchRes.rows[0];
    const games  = gamesRes.rows;
    const latestGame = games.length > 0
      ? { ...games[games.length - 1], gameNumber: games.length }
      : null;

    // ---- Conditionally fetch offers ----------------------------------------
    // Only relevant during the auction phase. offer_amount is stripped at the
    // SQL level for pending offers (consistent with the submit-offer and
    // accept-offer routes) rather than in JS after a SELECT *.
    let offers: unknown[] = [];
    if (latestGame?.status === 'auction pending') {
      const offersRes = await db.query(
        `SELECT
           id,
           game_id,
           from_player_id,
           target_player_id,
           status,
           tier_label,
           created_at,
           CASE WHEN status = 'pending' THEN NULL ELSE offer_amount END AS offer_amount
         FROM offers
         WHERE game_id = $1`,
        [latestGame.id]
      );
      offers = offersRes.rows;
    }

    return NextResponse.json({ match, players, games, latestGame, offers, currentUserId });

  } catch (error) {
    console.error('[MATCH_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
