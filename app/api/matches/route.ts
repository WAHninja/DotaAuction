import { NextRequest } from 'next/server';
import db from '../../../lib/db';
import { getSession } from '@/app/session';

export async function POST(req: NextRequest) {
  try {
    const { playerIds } = await req.json();

    if (!Array.isArray(playerIds) || playerIds.length < 4) {
      return new Response(
        JSON.stringify({ error: 'At least 4 players are required' }),
        { status: 400 }
      );
    }

    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // 🔑 Canonical sort for reliable comparison
    const sortedPlayerIds = [...new Set(playerIds)].sort((a, b) => a - b);

    const client = await db.connect();

    try {
      await client.query('BEGIN');

      /**
       * 1️⃣ Check for existing ongoing match with the same players
       */
      const existingMatchResult = await client.query(
        `
        SELECT m.id
        FROM matches m
        JOIN match_players mp ON mp.match_id = m.id
        WHERE m.status = 'in progress'
        GROUP BY m.id
        HAVING
          array_agg(mp.user_id ORDER BY mp.user_id) = $1::int[]
        LIMIT 1
        `,
        [sortedPlayerIds]
      );

      if (existingMatchResult.rows.length > 0) {
        const existingMatchId = existingMatchResult.rows[0].id;

        await client.query('COMMIT');

        return new Response(
          JSON.stringify({ id: existingMatchId, reused: true }),
          { status: 200 }
        );
      }

      /**
       * 2️⃣ Create new match (your existing logic)
       */
      const matchResult = await client.query(
        `INSERT INTO matches (created_at, status)
         VALUES (NOW(), 'ongoing')
         RETURNING id`
      );

      const matchId = matchResult.rows[0].id;

      for (const playerId of sortedPlayerIds) {
        await client.query(
          `INSERT INTO match_players (match_id, user_id, gold)
           VALUES ($1, $2, 0)`,
          [matchId, playerId]
        );
      }

      // Shuffle teams
      const shuffled = [...sortedPlayerIds].sort(() => Math.random() - 0.5);
      const mid = Math.ceil(shuffled.length / 2);
      const team1 = shuffled.slice(0, mid);
      const teamA = shuffled.slice(mid);

      const gameResult = await client.query(
        `
        INSERT INTO games (match_id, team_1_members, team_a_members, status)
        VALUES ($1, $2::int[], $3::int[], 'in progress')
        RETURNING id
        `,
        [matchId, team1, teamA]
      );

      const gameId = gameResult.rows[0].id;

      await client.query(
        'UPDATE matches SET game_id = $1 WHERE id = $2',
        [gameId, matchId]
      );

      await client.query('COMMIT');

      return new Response(
        JSON.stringify({ id: matchId, reused: false }),
        { status: 200 }
      );
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Transaction failed:', err);
      return new Response(
        JSON.stringify({ error: 'Failed to create or reuse match' }),
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Unexpected error in POST /api/matches:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
