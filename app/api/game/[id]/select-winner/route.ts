import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import Ably from 'ably/promises';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const gameId = parseInt(url.pathname.split('/')[3]); // /api/game/[id]/select-winner

    if (isNaN(gameId)) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
    }

    const { winningTeamId } = await req.json();

    if (!['team_1', 'team_a'].includes(winningTeamId)) {
      return NextResponse.json({ error: 'Invalid winningTeamId' }, { status: 400 });
    }

    const gameRes = await db.query(`SELECT * FROM Games WHERE id = $1`, [gameId]);
    if (gameRes.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = gameRes.rows[0];

    if (game.status !== 'In progress') {
      return NextResponse.json({ error: 'Game already completed or auction already started' }, { status: 400 });
    }

    // Step 1: Update game status and winner
    await db.query(
      `UPDATE Games SET status = 'Auction pending', winning_team = $1 WHERE id = $2`,
      [winningTeamId, gameId]
    );

    // Step 2: Apply 20% penalty to losing team members
    const losingTeamId = winningTeamId === 'team_1' ? 'team_a' : 'team_1';
    const losingMembers: number[] = game[`${losingTeamId}_members`];

    for (const playerId of losingMembers) {
      // Get current gold
      const goldRes = await db.query(
        `SELECT gold FROM match_players WHERE match_id = $1 AND user_id = $2`,
        [game.match_id, playerId]
      );

      const currentGold = goldRes.rows[0]?.gold ?? 0;
      const penalty = Math.floor(currentGold * 0.2);

      // Deduct gold
      await db.query(
        `UPDATE match_players SET gold = gold - $1 WHERE match_id = $2 AND user_id = $3`,
        [penalty, game.match_id, playerId]
      );

      // Log in GamePlayerStats
      await db.query(
        `INSERT INTO GamePlayerStats (game_id, player_id, team_id, gold_change, reason)
         VALUES ($1, $2, $3, $4, 'loss_penalty')`,
        [gameId, playerId, losingTeamId, -penalty]
      );
    }

    // Step 3: Notify via Ably
    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    const channel = ably.channels.get('match-' + game.match_id);
    await channel.publish('game-winner-selected', {
      gameId,
      matchId: game.match_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error selecting winning team for game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
