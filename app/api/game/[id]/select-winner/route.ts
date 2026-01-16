import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getMatchChannels } from '@/lib/ably-server';

type TeamId = 'team_1' | 'team_a';

export async function POST(req: NextRequest, context: any) {
  const client = await db.connect();
  let transactionStarted = false;

  try {
    const gameId = Number(context.params.id);
    if (!Number.isInteger(gameId)) {
      return new Response(JSON.stringify({ error: 'Invalid game ID' }), { status: 400 });
    }

    const { winningTeamId }: { winningTeamId: TeamId } = await req.json();
    if (winningTeamId !== 'team_1' && winningTeamId !== 'team_a') {
      return new Response(JSON.stringify({ error: 'Invalid winningTeamId' }), { status: 400 });
    }

    // ---------------- Begin transaction ----------------
    await client.query('BEGIN');
    transactionStarted = true;

    // ---------------- Load & lock game ----------------
    const { rows: gameRows } = await client.query(
      'SELECT * FROM games WHERE id = $1 FOR UPDATE',
      [gameId]
    );

    if (gameRows.length === 0) {
      return new Response(JSON.stringify({ error: 'Game not found' }), { status: 404 });
    }

    const game = gameRows[0];

    if (game.winning_team) {
      return new Response(JSON.stringify({ error: 'Winner already submitted' }), { status: 409 });
    }

    if (game.status !== 'in progress') {
      return new Response(JSON.stringify({ error: 'Game is not in progress' }), { status: 400 });
    }

    const winningMembers: number[] = game[`${winningTeamId}_members`];
    const losingTeamId: TeamId = winningTeamId === 'team_1' ? 'team_a' : 'team_1';

    // ---------------- Single winner shortcut ----------------
    if (winningMembers.length === 1) {
      const winnerId = winningMembers[0];

      await client.query(
        'UPDATE games SET status = $1, winning_team = $2 WHERE id = $3',
        ['finished', winningTeamId, gameId]
      );

      await client.query(
        'UPDATE matches SET status = $1, winner_id = $2 WHERE id = $3',
        ['finished', winnerId, game.match_id]
      );

      await client.query('COMMIT');
      transactionStarted = false;

      const { game: gameChannel } = getMatchChannels(game.match_id);

      await gameChannel.publish('game-winner-selected', {
        gameId,
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Match finished with single winner.' }),
        { status: 200 }
      );
    }

    // ---------------- Gold calculations ----------------
    const losingMembers: number[] = game[`${losingTeamId}_members`];

    const { rows: losingGoldRes } = await client.query(
      'SELECT user_id, gold FROM match_players WHERE match_id = $1 AND user_id = ANY($2)',
      [game.match_id, losingMembers]
    );

    let bonusPool = 0;
    for (const row of losingGoldRes) {
      bonusPool += Math.floor(row.gold * 0.5);
    }

    const perWinnerBonus = Math.floor(bonusPool / winningMembers.length);

    await client.query(
      'UPDATE games SET status = $1, winning_team = $2 WHERE id = $3',
      ['auction pending', winningTeamId, gameId]
    );

    // Reward winners
    for (const playerId of winningMembers) {
      const reward = 1000 + perWinnerBonus;

      await client.query(
        'UPDATE match_players SET gold = gold + $1 WHERE match_id = $2 AND user_id = $3',
        [reward, game.match_id, playerId]
      );

      await client.query(
        `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
         VALUES ($1,$2,$3,$4,'win_reward')`,
        [gameId, playerId, winningTeamId, reward]
      );
    }

    // Penalise losers
    for (const playerId of losingMembers) {
      const penalty = Math.floor(
        (losingGoldRes.find(r => r.user_id === playerId)?.gold ?? 0) * 0.5
      );

      await client.query(
        'UPDATE match_players SET gold = gold - $1 WHERE match_id = $2 AND user_id = $3',
        [penalty, game.match_id, playerId]
      );

      await client.query(
        `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
         VALUES ($1,$2,$3,$4,'loss_penalty')`,
        [gameId, playerId, losingTeamId, -penalty]
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;

    // ---------------- Realtime signal ----------------
    const { game: gameChannel } = getMatchChannels(game.match_id);

    await gameChannel.publish('game-winner-selected', {
      gameId,
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Winner selected, auction pending.' }),
      { status: 200 }
    );
  } catch (err) {
    if (transactionStarted) await client.query('ROLLBACK');
    console.error('select-winner error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  } finally {
    client.release();
  }
}
