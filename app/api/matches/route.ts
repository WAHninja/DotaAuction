import { NextRequest } from 'next/server';
import db from '../../../lib/db';
import { getSession } from '@/app/session';

export async function POST(req: NextRequest) {
  try {
    const { playerIds } = await req.json();

    if (!Array.isArray(playerIds) || playerIds.length < 4) {
      console.error('Invalid playerIds:', playerIds);
      return new Response(JSON.stringify({ error: 'At least 4 players are required' }), {
        status: 400,
      });
    }

    const session = await getSession();
    console.log('Session:', session);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const matchResult = await client.query(
        'INSERT INTO matches (created_at) VALUES (NOW()) RETURNING id'
      );
      const matchId = matchResult.rows[0].id;
      console.log('Created match ID:', matchId);

      for (const playerId of playerIds) {
        await client.query(
          'INSERT INTO match_players (match_id, user_id, gold) VALUES ($1, $2, $3)',
          [matchId, playerId, 0]
        );
      }

      const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
      const mid = Math.ceil(shuffled.length / 2);
      const team1 = shuffled.slice(0, mid);
      const teamA = shuffled.slice(mid);
      console.log('Team 1:', team1, 'Team A:', teamA);

      const gameResult = await client.query(
        `INSERT INTO games (match_id, team_1_members, team_a_members, status)
         VALUES ($1, $2::int[], $3::int[], 'In progress') RETURNING id`,
        [matchId, team1, teamA]
      );
      const gameId = gameResult.rows[0].id;

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
    console.error('Unexpected error in POST /api/matches:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
