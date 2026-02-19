import { NextRequest, NextResponse } from 'next/server';
import db from '../../../lib/db';
import { getSession } from '@/app/session';

export async function POST(req: NextRequest) {
  try {
    const { playerIds } = await req.json();

    if (!Array.isArray(playerIds) || playerIds.length < 4) {
      return NextResponse.json({ error: 'At least 4 players are required' }, { status: 400 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ---- Check for an existing in-progress match with the same players -----
    // We look for a match that:
    //   1. Has no winner yet (still in progress)
    //   2. Has exactly the same set of players — same count, all IDs match
    //
    // The ANY($1) + COUNT trick works as follows:
    //   - Inner query 1: counts how many of the selected playerIds are in the match
    //   - Inner query 2: counts total participants in the match
    // Both must equal the number of submitted playerIds for an exact set match.
    const existingMatchRes = await db.query(
      `SELECT m.id
       FROM matches m
       WHERE m.winner_id IS NULL
         AND (
           SELECT COUNT(*)
           FROM match_players mp
           WHERE mp.match_id = m.id
             AND mp.user_id = ANY($1::int[])
         ) = $2
         AND (
           SELECT COUNT(*)
           FROM match_players mp
           WHERE mp.match_id = m.id
         ) = $2
       LIMIT 1`,
      [playerIds, playerIds.length]
    );

    if (existingMatchRes.rows.length > 0) {
      const existingMatchId = existingMatchRes.rows[0].id;
      return NextResponse.json({ id: existingMatchId, existing: true });
    }

    // ---- No existing match found — create a new one ------------------------
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const matchResult = await client.query(
        'INSERT INTO matches (created_at) VALUES (NOW()) RETURNING id'
      );
      const matchId = matchResult.rows[0].id;

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

      const gameResult = await client.query(
        `INSERT INTO games (match_id, team_1_members, team_a_members, status)
         VALUES ($1, $2::int[], $3::int[], 'in progress') RETURNING id`,
        [matchId, team1, teamA]
      );
      const gameId = gameResult.rows[0].id;

      await client.query(
        'UPDATE matches SET game_id = $1 WHERE id = $2',
        [gameId, matchId]
      );

      await client.query('COMMIT');

      return NextResponse.json({ id: matchId, existing: false });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Transaction failed:', err);
      return NextResponse.json({ error: 'Failed to create match' }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Unexpected error in POST /api/matches:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
