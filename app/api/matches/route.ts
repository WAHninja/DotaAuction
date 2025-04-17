// app/api/matches/route.ts
import { NextRequest } from 'next/server';
import db from '../../../lib/db';
import { getSession } from '../../../lib/session';

export async function POST(req: NextRequest) {
  const { playerIds } = await req.json();

  if (!Array.isArray(playerIds) || playerIds.length < 4) {
    return new Response(JSON.stringify({ error: 'At least 4 players are required' }), {
      status: 400,
    });
  }

  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // 1. Create the Match (no created_by column)
      const matchResult = await client.query(
        'INSERT INTO matches (created_at) VALUES (NOW()) RETURNING id'
      );
      const matchId = matchResult.rows[0].id;

      // 2. Insert into match_players with gold = 0
      const insertPlayerPromises = playerIds.map((playerId) => {
        return client.query(
          'INSERT INTO match_players (match_id, player_id, gold) VALUES ($1, $2, $3)',
          [matchId, playerId, 0]
        );
      });
      await Promise.all(insertPlayerPromises);

      // 3. Shuffle and split players randomly between two teams
      const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
      const mid = Math.ceil(shuffled.length / 2);
      const team1 = shuffled.slice(0, mid);
      const teamA = shuffled.slice(mid);

      // 4. Insert into Games table
      const gameResult = await client.query(
        `INSERT INTO games (match_id, team_1_members, team_a_members, status)
         VALUES ($1, $2, $3, 'Pending') RETURNING id`,
        [matchId, team1, teamA]
      );

      const gameId = gameResult.rows[0].id;

      // 5. Update Matches table with current_game_id
      await client.query(
        'UPDATE matches SET game_id = $1 WHERE id = $2',
        [gameId, matchId]
      );

      await client.query('COMMIT');
      return new Response(JSON.stringify({ id: matchId }), { status: 200 });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Transaction failed:', err);
      return new Response(JSON.stringify({ error: 'Failed to create match' }), { status: 500 });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database connection error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
