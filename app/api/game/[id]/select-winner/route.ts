import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import ably from '@/lib/ably-server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // ---- Auth ----------------------------------------------------------------
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  // ---- Parse inputs --------------------------------------------------------
  const gameId = Number(params.id);
  if (isNaN(gameId)) {
    return NextResponse.json({ error: 'Invalid game ID.' }, { status: 400 });
  }

  let winningTeamId: string;
  try {
    ({ winningTeamId } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!['team_1', 'team_a'].includes(winningTeamId)) {
    return NextResponse.json({ error: 'Invalid winningTeamId.' }, { status: 400 });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // ---- Verify membership -------------------------------------------------
    const gameCheck = await client.query(
      `SELECT match_id FROM games WHERE id = $1`,
      [gameId]
    );

    if (gameCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
    }

    const matchId: number = gameCheck.rows[0].match_id;

    const membershipRes = await client.query(
      `SELECT 1 FROM match_players WHERE match_id = $1 AND user_id = $2`,
      [matchId, session.userId]
    );

    if (membershipRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'You are not a participant in this match.' }, { status: 403 });
    }

    // ---- Atomically claim the status transition ----------------------------
    // UPDATE ... WHERE status = 'in progress' RETURNING is a single atomic
    // operation. If two requests race, only one will match the WHERE clause
    // and get rows back. The other gets zero rows and a 409 with no side
    // effects — gold is never touched for the losing request.
    const { rows: updatedRows } = await client.query(
      `UPDATE games
       SET status = 'auction pending', winning_team = $1
       WHERE id = $2 AND status = 'in progress'
       RETURNING *`,
      [winningTeamId, gameId]
    );

    if (updatedRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Winner already selected or game not in progress.' },
        { status: 409 }
      );
    }

    const game = updatedRows[0];
    const losingTeamId   = winningTeamId === 'team_1' ? 'team_a' : 'team_1';
    const winningMembers: number[] = game[`${winningTeamId}_members`];
    const losingMembers:  number[] = game[`${losingTeamId}_members`];

    // ---- Single-player winning team: match ends immediately ----------------
    if (winningMembers.length === 1) {
      const winningPlayerId = winningMembers[0];

      await client.query(
        `UPDATE games SET status = 'finished' WHERE id = $1`,
        [gameId]
      );

      await client.query(
        `UPDATE matches SET status = 'finished', winner_id = $1 WHERE id = $2`,
        [winningPlayerId, matchId]
      );

      await client.query('COMMIT');

      await ably.channels.get(`match-${matchId}`).publish('game-winner-selected', {
        gameId,
        matchId,
        winnerId: winningPlayerId,
      });

      return NextResponse.json({ success: true, message: 'Match finished with single winner.' });
    }

    // ---- Distribute gold ---------------------------------------------------
    let totalBonusPool = 0;
    const losingGolds: Record<number, number> = {};

    for (const playerId of losingMembers) {
      const goldRes = await client.query(
        `SELECT gold FROM match_players WHERE match_id = $1 AND user_id = $2`,
        [matchId, playerId]
      );
      const currentGold = goldRes.rows[0]?.gold ?? 0;
      losingGolds[playerId] = currentGold;
      totalBonusPool += Math.floor(currentGold * 0.5);
    }

    const perWinnerBonus = Math.floor(totalBonusPool / winningMembers.length);

    for (const playerId of winningMembers) {
      const totalReward = 1000 + perWinnerBonus;

      await client.query(
        `UPDATE match_players SET gold = gold + $1 WHERE match_id = $2 AND user_id = $3`,
        [totalReward, matchId, playerId]
      );

      await client.query(
        `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
         VALUES ($1, $2, $3, $4, 'win_reward')`,
        [gameId, playerId, winningTeamId, totalReward]
      );
    }

    for (const playerId of losingMembers) {
      const penalty = Math.floor(losingGolds[playerId] * 0.5);

      await client.query(
        `UPDATE match_players SET gold = gold - $1 WHERE match_id = $2 AND user_id = $3`,
        [penalty, matchId, playerId]
      );

      await client.query(
        `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
         VALUES ($1, $2, $3, $4, 'loss_penalty')`,
        [gameId, playerId, losingTeamId, -penalty]
      );
    }

    await client.query('COMMIT');

    await ably.channels.get(`match-${matchId}`).publish('game-winner-selected', {
      gameId,
      matchId,
    });

    return NextResponse.json({ success: true, message: 'Winner selected, auction pending.' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[SELECT_WINNER_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });

  } finally {
    client.release();
  }
}
