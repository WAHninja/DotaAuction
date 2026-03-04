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

    // ---- Existence check ---------------------------------------------------
    if (matchRes.rowCount === 0) {
      return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
    }
    // No membership check — any authenticated user can view any match as a
    // spectator. Action routes (submit-offer, accept-offer, select-winner)
    // enforce membership independently. The UI already hides all action
    // buttons when currentUserId doesn't match any player in the match.

    const match      = matchRes.rows[0];
    const players    = playersRes.rows;
    const games      = gamesRes.rows;
    const latestGame = games.length > 0
      ? { ...games[games.length - 1], gameNumber: games.length }
      : null;

    // ---- Conditionally fetch offers ----------------------------------------
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
