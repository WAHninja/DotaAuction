import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import { broadcastEvent } from '@/lib/supabase-server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ---- Auth ----------------------------------------------------------------
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  // ---- Validate route param ------------------------------------------------
  const { id } = await params;
  const gameId  = Number(id);
  if (!Number.isInteger(gameId) || gameId <= 0) {
    return NextResponse.json({ error: 'Invalid game ID.' }, { status: 400 });
  }

  // ---- Validate + parse body -----------------------------------------------
  let winningTeamId: 'team_1' | 'team_a';
  try {
    const body = await req.json();
    if (body.winningTeamId !== 'team_1' && body.winningTeamId !== 'team_a') {
      return NextResponse.json(
        { error: 'winningTeamId must be "team_1" or "team_a".' },
        { status: 400 }
      );
    }
    winningTeamId = body.winningTeamId;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // ---- Load game state + verify membership in one locked query -----------
    const { rows: gameRows } = await client.query<{
      match_id: number;
      status: string;
      team_1_members: number[];
      team_a_members: number[];
      is_member: boolean;
    }>(
      `SELECT
         g.match_id,
         g.status,
         g.team_1_members,
         g.team_a_members,
         EXISTS(
           SELECT 1
           FROM match_players mp
           WHERE mp.match_id = g.match_id
             AND mp.user_id  = $2
         ) AS is_member
       FROM games g
       WHERE g.id = $1
       FOR UPDATE`,
      [gameId, session.userId]
    );

    if (gameRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
    }

    const game = gameRows[0];

    if (!game.is_member) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'You are not a participant in this match.' },
        { status: 403 }
      );
    }

    if (game.status !== 'in progress') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Winner already selected or game not in progress.' },
        { status: 409 }
      );
    }

    const matchId        = game.match_id;
    const losingTeamId   = winningTeamId === 'team_1' ? 'team_a' : 'team_1';
    const winningMembers = game[`${winningTeamId}_members`] as number[];
    const losingMembers  = game[`${losingTeamId}_members`]  as number[];

    const isSinglePlayerWin = winningMembers.length === 1;
    const targetStatus = isSinglePlayerWin ? 'finished' : 'auction pending';

    await client.query(
      `UPDATE games
       SET status = $1, winning_team = $2
       WHERE id = $3`,
      [targetStatus, winningTeamId, gameId]
    );

    // ---- Single-player winning team: match ends immediately ----------------
    //
    // When one player wins alone, the match is over and no gold calculations
    // are applied for this final game. This is intentional.
    //
    // Why gold is NOT applied here:
    //
    //   The match-level gold totals stored in match_players reflect each
    //   player's accumulated gold at the START of the current game — i.e.
    //   what they earned across all previous games. This is the figure the
    //   Stats tab and Hall of Fame queries read to compare players' standing.
    //
    //   If we applied win rewards and loss penalties here, those totals would
    //   represent an inflated post-game state rather than the authentic
    //   "going into the final game" snapshot. A player who won with 500 gold
    //   would suddenly show 1,500+ gold, misrepresenting how close (or not)
    //   the final game actually was.
    //
    //   Similarly, no game_player_stats rows are written for this game.
    //   The GameHistory component handles missing stats gracefully (empty
    //   goldTotal and dotaStats), so the final game card will render without
    //   gold deltas — which is the correct representation: no trade occurred,
    //   and the match-ending gold state is already readable from the team cards
    //   that were visible at the start of the game.
    //
    //   Every non-final game correctly writes stats and gold changes because
    //   those transactions are meaningful inputs to the auction that follows.
    //   The final game has no auction, so there is nothing to fund.
    if (isSinglePlayerWin) {
      const winningPlayerId = winningMembers[0];

      await client.query(
        `UPDATE matches SET status = 'finished', winner_id = $1 WHERE id = $2`,
        [winningPlayerId, matchId]
      );

      await client.query('COMMIT');

      await broadcastEvent(
        `match-${matchId}`,
        'game-winner-selected',
        { gameId, matchId, winnerId: winningPlayerId }
      );

      return NextResponse.json({
        success: true,
        message: 'Match finished with single winner.',
      });
    }

    // ---- Multi-player winning team: apply gold and advance to auction ------
    //
    // Gold changes are meaningful here because they fund the auction that
    // immediately follows. Losers pay 50% into a shared pool; winners receive
    // a 1,000 base reward plus an equal share of that pool.

    // ---- Bulk fetch all loser gold in one query ----------------------------
    const loserGoldRes = await client.query<{ user_id: number; gold: number }>(
      `SELECT user_id, gold
       FROM match_players
       WHERE match_id = $1
         AND user_id = ANY($2::int[])`,
      [matchId, losingMembers]
    );

    const losingGolds = new Map<number, number>(
      loserGoldRes.rows.map(r => [r.user_id, r.gold])
    );

    const losingPenalties = losingMembers.map(
      id => Math.floor((losingGolds.get(id) ?? 0) * 0.5)
    );
    const totalBonusPool = losingPenalties.reduce((sum, p) => sum + p, 0);
    const perWinnerBonus = Math.floor(totalBonusPool / winningMembers.length);
    const totalReward    = 1000 + perWinnerBonus;

    // ---- Bulk update winner gold -------------------------------------------
    await client.query(
      `UPDATE match_players
       SET gold = gold + $1
       WHERE match_id = $2
         AND user_id = ANY($3::int[])`,
      [totalReward, matchId, winningMembers]
    );

    // ---- Bulk insert winner stats ------------------------------------------
    await client.query(
      `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
       SELECT $1, unnest($2::int[]), $3, $4, 'win_reward'`,
      [gameId, winningMembers, winningTeamId, totalReward]
    );

    // ---- Bulk update loser gold --------------------------------------------
    await client.query(
      `UPDATE match_players mp
       SET gold = gold - v.penalty
       FROM unnest($1::int[], $2::int[]) AS v(user_id, penalty)
       WHERE mp.match_id = $3
         AND mp.user_id  = v.user_id`,
      [losingMembers, losingPenalties, matchId]
    );

    // ---- Bulk insert loser stats -------------------------------------------
    await client.query(
      `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
       SELECT $1, v.user_id, $2, -v.penalty, 'loss_penalty'
       FROM unnest($3::int[], $4::int[]) AS v(user_id, penalty)`,
      [gameId, losingTeamId, losingMembers, losingPenalties]
    );

    await client.query('COMMIT');

    await broadcastEvent(
      `match-${matchId}`,
      'game-winner-selected',
      { gameId, matchId }
    );

    return NextResponse.json({
      success: true,
      message: 'Winner selected, auction pending.',
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[SELECT_WINNER_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });

  } finally {
    client.release();
  }
}
