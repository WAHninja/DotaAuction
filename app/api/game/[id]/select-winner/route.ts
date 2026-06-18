import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import { broadcastEvent } from '@/lib/supabase-server';
import { checkGoldThresholdWin } from '@/lib/gold-win';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ---- Auth ----------------------------------------------------------------
  // Accepts either a valid user session (normal web flow) or an internal
  // secret header (Supabase Edge Function / Dota plugin flow).
  const internalSecret = req.headers.get('x-internal-secret');
  const isInternalCall =
    !!internalSecret &&
    internalSecret === process.env.INTERNAL_API_SECRET;

  const session = isInternalCall ? null : await getSession();

  if (!isInternalCall && !session?.userId) {
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

    // ---- Load game state ---------------------------------------------------
    const { rows: gameRows } = await client.query<{
      match_id: number;
      status: string;
      team_1_members: number[];
      team_a_members: number[];
      is_member: boolean;
    }>(
      isInternalCall
        ? `SELECT
             g.match_id,
             g.status,
             g.team_1_members,
             g.team_a_members,
             true AS is_member
           FROM games g
           WHERE g.id = $1
           FOR UPDATE`
        : `SELECT
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
      isInternalCall ? [gameId] : [gameId, session!.userId]
    );

    if (gameRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
    }

    const game = gameRows[0];

    if (!isInternalCall && !game.is_member) {
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

    const matchId = game.match_id;

    const winningMembers: number[] =
      winningTeamId === 'team_1' ? game.team_1_members : game.team_a_members;
    const losingTeamId: 'team_1' | 'team_a' =
      winningTeamId === 'team_1' ? 'team_a' : 'team_1';
    const losingMembers: number[] =
      losingTeamId === 'team_1' ? game.team_1_members : game.team_a_members;

    // ---- Single-player win: original last-standing condition ---------------
    // No gold distribution on the final game — match ends immediately.
    // finished_at is set here (rather than left to a trigger) since this is
    // the single place that transitions this row to 'finished'.
    const isSinglePlayerWin = winningMembers.length === 1;

    if (isSinglePlayerWin) {
      const winningPlayerId = winningMembers[0];

      await client.query(
        `UPDATE games
         SET status = 'finished', winning_team = $1, finished_at = NOW()
         WHERE id = $2`,
        [winningTeamId, gameId]
      );

      await client.query(
        `UPDATE matches
         SET status = 'finished', winner_id = $1, win_type = 'last_standing'
         WHERE id = $2`,
        [winningPlayerId, matchId]
      );

      await client.query('COMMIT');

      await broadcastEvent(
        `match-${matchId}`,
        'game-winner-selected',
        { gameId, matchId, winnerId: winningPlayerId, winType: 'last_standing' }
      );

      return NextResponse.json({
        success: true,
        message: 'Match finished — last player standing.',
      });
    }

    // ---- Multi-player path: distribute gold then check threshold -----------
    // Set to 'auction pending' now. If gold threshold fires below, a second
    // UPDATE corrects this to 'finished' (and sets finished_at) within the
    // same transaction — the intermediate state is never visible to clients.
    await client.query(
      `UPDATE games
       SET status = 'auction pending', winning_team = $1
       WHERE id = $2`,
      [winningTeamId, gameId]
    );

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

    await client.query(
      `UPDATE match_players
       SET gold = gold + $1
       WHERE match_id = $2
         AND user_id = ANY($3::int[])`,
      [totalReward, matchId, winningMembers]
    );

    await client.query(
      `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
       SELECT $1, unnest($2::int[]), $3, $4, 'win_reward'`,
      [gameId, winningMembers, winningTeamId, totalReward]
    );

    await client.query(
      `UPDATE match_players mp
       SET gold = gold - v.penalty
       FROM unnest($1::int[], $2::int[]) AS v(user_id, penalty)
       WHERE mp.match_id = $3
         AND mp.user_id  = v.user_id`,
      [losingMembers, losingPenalties, matchId]
    );

    await client.query(
      `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
       SELECT $1, v.user_id, $2, -v.penalty, 'loss_penalty'
       FROM unnest($3::int[], $4::int[]) AS v(user_id, penalty)`,
      [gameId, losingTeamId, losingMembers, losingPenalties]
    );

    // ---- Gold threshold win check ------------------------------------------
    // All gold distributed. If any player is now at or above 100,000,
    // the match ends — no auction opens. Highest gold wins the tie.
    const goldWin = await checkGoldThresholdWin(matchId, client);

    if (goldWin) {
      // Override the 'auction pending' status set above — same transaction
      // so the intermediate value is never visible to clients. finished_at
      // is set here since this is the moment the game actually finishes.
      await client.query(
        `UPDATE games SET status = 'finished', finished_at = NOW() WHERE id = $1`,
        [gameId]
      );

      await client.query(
        `UPDATE matches
         SET status = 'finished', winner_id = $1, win_type = 'gold_threshold'
         WHERE id = $2`,
        [goldWin.winnerId, matchId]
      );

      await client.query('COMMIT');

      await broadcastEvent(
        `match-${matchId}`,
        'game-winner-selected',
        { gameId, matchId, winnerId: goldWin.winnerId, winType: 'gold_threshold' }
      );

      return NextResponse.json({
        success: true,
        message: 'Match finished — gold threshold reached.',
      });
    }

    // ---- No threshold win: proceed to auction ------------------------------
    // Note: the game stays 'auction pending' here, not 'finished' — it only
    // becomes 'finished' once an offer is accepted (see accept-offer route),
    // which is also where finished_at gets set for this path.
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

  } catch (error: unknown) {
    await client.query('ROLLBACK');
    console.error('[SELECT_WINNER_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });

  } finally {
    client.release();
  }
}
