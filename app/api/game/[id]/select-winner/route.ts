import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import Ably from 'ably/promises';

const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

export async function POST(req: NextRequest) {
  // ---- Auth ----------------------------------------------------------------
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  // ---- Parse inputs --------------------------------------------------------
  const url = new URL(req.url);
  const gameId = parseInt(url.pathname.split('/')[3]); // /api/game/[id]/select-winner

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

  try {
    // ---- Fetch game --------------------------------------------------------
    const gameRes = await db.query(
      `SELECT * FROM games WHERE id = $1`,
      [gameId]
    );

    if (gameRes.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
    }

    const game = gameRes.rows[0];

    // ---- Verify the user is a participant of this match --------------------
    const membershipRes = await db.query(
      `SELECT 1 FROM match_players WHERE match_id = $1 AND user_id = $2`,
      [game.match_id, session.userId]
    );

    if (membershipRes.rows.length === 0) {
      return NextResponse.json({ error: 'You are not a participant in this match.' }, { status: 403 });
    }

    // ---- Validate game state -----------------------------------------------
    if (game.status !== 'in progress') {
      return NextResponse.json(
        { error: 'Game is already completed or in auction.' },
        { status: 400 }
      );
    }

    // ---- Single-player team: match ends immediately ------------------------
    const winningMembers: number[] = game[`${winningTeamId}_members`];

    if (winningMembers.length === 1) {
      const winningPlayerId = winningMembers[0];

      await db.query(
        `UPDATE games SET status = 'finished', winning_team = $1 WHERE id = $2`,
        [winningTeamId, gameId]
      );

      await db.query(
        `UPDATE matches SET status = 'finished', winner_id = $1 WHERE id = $2`,
        [winningPlayerId, game.match_id]
      );

      await ably.channels.get(`match-${game.match_id}`).publish('game-winner-selected', {
        gameId,
        matchId: game.match_id,
        winnerId: winningPlayerId,
      });

      return NextResponse.json({ success: true, message: 'Match finished with single winner.' });
    }

    // ---- Regular flow: auction + gold distribution -------------------------
    await db.query(
      `UPDATE games SET status = 'auction pending', winning_team = $1 WHERE id = $2`,
      [winningTeamId, gameId]
    );

    const losingTeamId = winningTeamId === 'team_1' ? 'team_a' : 'team_1';
    const losingMembers: number[] = game[`${losingTeamId}_members`];

    // Calculate bonus pool from half of each losing player's gold
    let totalBonusPool = 0;
    const losingGolds: Record<number, number> = {};

    for (const playerId of losingMembers) {
      const goldRes = await db.query(
        `SELECT gold FROM match_players WHERE match_id = $1 AND user_id = $2`,
        [game.match_id, playerId]
      );
      const currentGold = goldRes.rows[0]?.gold ?? 0;
      losingGolds[playerId] = currentGold;
      totalBonusPool += Math.floor(currentGold * 0.5);
    }

    // Distribute 1000 base + share of bonus pool to each winner
    const perWinnerBonus = Math.floor(totalBonusPool / winningMembers.length);

    for (const playerId of winningMembers) {
      const totalReward = 1000 + perWinnerBonus;

      await db.query(
        `UPDATE match_players SET gold = gold + $1 WHERE match_id = $2 AND user_id = $3`,
        [totalReward, game.match_id, playerId]
      );

      await db.query(
        `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
         VALUES ($1, $2, $3, $4, 'win_reward')`,
        [gameId, playerId, winningTeamId, totalReward]
      );
    }

    // Apply 50% penalty to each losing player
    for (const playerId of losingMembers) {
      const penalty = Math.floor(losingGolds[playerId] * 0.5);

      await db.query(
        `UPDATE match_players SET gold = gold - $1 WHERE match_id = $2 AND user_id = $3`,
        [penalty, game.match_id, playerId]
      );

      await db.query(
        `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
         VALUES ($1, $2, $3, $4, 'loss_penalty')`,
        [gameId, playerId, losingTeamId, -penalty]
      );
    }

    await ably.channels.get(`match-${game.match_id}`).publish('game-winner-selected', {
      gameId,
      matchId: game.match_id,
    });

    return NextResponse.json({ success: true, message: 'Winner selected, auction pending.' });

  } catch (error) {
    console.error('[SELECT_WINNER_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
