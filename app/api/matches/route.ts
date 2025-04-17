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
    // Start a transaction
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Insert the match
      const matchResult = await client.query(
        'INSERT INTO matches (created_by, created_at) VALUES ($1, NOW()) RETURNING id',
        [session.user_id]
      );
      const matchId = matchResult.rows[0].id;

      // Insert players into match_players
      const insertPromises = playerIds.map((playerId) => {
        return client.query(
          'INSERT INTO match_players (match_id, player_id, gold) VALUES ($1, $2, $3)',
          [matchId, playerId, 10000]
        );
      });
      await Promise.all(insertPromises);

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
