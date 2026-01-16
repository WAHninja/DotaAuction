// app/api/game/[id]/select-winner/route.ts
import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getMatchChannels } from '@/lib/ably-server';
import { buildGameSnapshot } from '@/lib/buildGameSnapshot';

type TeamId = 'team_1' | 'team_a';

export async function POST(req: NextRequest, context: any) {
  const client = await db.connect();
  let tx = false;

  try {
    const gameId = Number(context.params.id);
    if (!Number.isInteger(gameId)) {
      return Response.json({ error: 'Invalid game ID' }, { status: 400 });
    }

    const { winningTeamId }: { winningTeamId: TeamId } = await req.json();
    if (!['team_1', 'team_a'].includes(winningTeamId)) {
      return Response.json({ error: 'Invalid winningTeamId' }, { status: 400 });
    }

    await client.query('BEGIN');
    tx = true;

    // Lock game
    const { rows } = await client.query(
      `SELECT * FROM games WHERE id = $1 FOR UPDATE`,
      [gameId]
    );

    if (rows.length === 0) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = rows[0];

    if (game.phase !== 'in_progress') {
      return Response.json({ error: 'Winner already selected' }, { status: 409 });
    }

    const winningMembers: number[] = game[`${winningTeamId}_members`];
    const losingTeamId: TeamId =
      winningTeamId === 'team_1' ? 'team_a' : 'team_1';
    const losingMembers: number[] = game[`${losingTeamId}_members`];

    // ---------------- Single winner shortcut ----------------
    if (winningMembers.length === 1) {
      const winnerId = winningMembers[0];

      await client.query(
        `UPDATE games
         SET phase = 'completed', winning_team = $1
         WHERE id = $2`,
        [winningTeamId, gameId]
      );

      await client.query(
        `UPDATE matches
         SET status = 'finished', winner_id = $1
         WHERE id = $2`,
        [winnerId, game.match_id]
      );

      await client.query('COMMIT');
      tx = false;

      const snapshot = await buildGameSnapshot(game.match_id);
      const { game: channel } = getMatchChannels(game.match_id);

      await channel.publish('snapshot', snapshot);

      return Response.json({ success: true });
    }

    // ---------------- Gold calculations ----------------
    const { rows: losingGold } = await client.query(
      `SELECT user_id, gold
       FROM match_players
       WHERE match_id = $1 AND user_id = ANY($2)`,
      [game.match_id, losingMembers]
    );

    let bonusPool = 0;
    for (const row of losingGold) {
      bonusPool += Math.floor(row.gold * 0.5);
    }

    const perWinnerBonus = Math.floor(bonusPool / winningMembers.length);

    await client.query(
      `UPDATE games
       SET phase = 'auction', winning_team = $1
       WHERE id = $2`,
      [winningTeamId, gameId]
    );

    // Winners
    for (const playerId of winningMembers) {
      const reward = 1000 + perWinnerBonus;

      await client.query(
        `UPDATE match_players
         SET gold = gold + $1
         WHERE match_id = $2 AND user_id = $3`,
        [reward, game.match_id, playerId]
      );
    }

    // Losers
    for (const playerId of losingMembers) {
      const penalty =
        Math.floor(
          losingGold.find(r => r.user_id === playerId)?.gold ?? 0
        ) * 0.5;

      await client.query(
        `UPDATE match_players
         SET gold = gold - $1
         WHERE match_id = $2 AND user_id = $3`,
        [penalty, game.match_id, playerId]
      );
    }

    await client.query('COMMIT');
    tx = false;

    // ---------------- Publish snapshot ----------------
    const snapshot = await buildGameSnapshot(game.match_id);
    const { game: channel } = getMatchChannels(game.match_id);

    await channel.publish('snapshot', snapshot);

    return Response.json({ success: true });
  } catch (err) {
    if (tx) await client.query('ROLLBACK');
    console.error('select-winner error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
