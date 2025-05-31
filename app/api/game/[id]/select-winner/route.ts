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

    if (game.status !== 'in progress') {
      return NextResponse.json({ error: 'Game already completed or auction already started' }, { status: 400 });
    }

    const winningMembers: number[] = game[`${winningTeamId}_members`];

    if (winningMembers.length === 1) {
      // ✅ Only one player on the winning team: Finish game and match
      const winningPlayerId = winningMembers[0];

      await db.query(
        `UPDATE Games SET status = 'finished', winning_team = $1 WHERE id = $2`,
        [winningTeamId, gameId]
      );

      await db.query(
        `UPDATE Matches SET status = 'finished', winner_id = $1 WHERE id = $2`,
        [winningPlayerId, game.match_id]
      );

      // ✅ Notify via Ably
      const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
      const channel = ably.channels.get('match-' + game.match_id);
      await channel.publish('game-winner-selected', {
        gameId,
        matchId: game.match_id,
        winnerId: winningPlayerId,
      });

      return NextResponse.json({ success: true, message: 'Match finished with single winner.' });
    }

    // ✅ Regular flow: Set to auction pending and penalize losing team
await db.query(
  `UPDATE Games SET status = 'auction pending', winning_team = $1 WHERE id = $2`,
  [winningTeamId, gameId]
);

const losingTeamId = winningTeamId === 'team_1' ? 'team_a' : 'team_1';
const losingMembers: number[] = game[`${losingTeamId}_members`];

// 🔻 Penalize losing team members
for (const playerId of losingMembers) {
  const goldRes = await db.query(
    `SELECT gold FROM match_players WHERE match_id = $1 AND user_id = $2`,
    [game.match_id, playerId]
  );

  const currentGold = goldRes.rows[0]?.gold ?? 0;
  const penalty = Math.floor(currentGold * 0.5);

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

// 🟢 Reward winning team members with +500 gold
for (const playerId of winningMembers) {
  await db.query(
    `UPDATE match_players SET gold = gold + 500 WHERE match_id = $1 AND user_id = $2`,
    [game.match_id, playerId]
  );

  await db.query(
    `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
     VALUES ($1, $2, $3, $4, 'win_reward')`,
    [gameId, playerId, winningTeamId, 500]
  );
}

    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    const channel = ably.channels.get('match-' + game.match_id);
    await channel.publish('game-winner-selected', {
      gameId,
      matchId: game.match_id,
    });

    return NextResponse.json({ success: true, message: 'Winner selected, auction pending.' });

  } catch (error) {
    console.error('Error selecting winning team for game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
