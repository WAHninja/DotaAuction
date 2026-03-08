import { NextRequest, NextResponse } from 'next/server';
import db from '../../../lib/db';
import { getSession } from '@/app/session';

export async function POST(req: NextRequest) {
  // ---- Auth first ----------------------------------------------------------
  // Always validate the session before touching the request body. The previous
  // version parsed and validated the body before checking auth, meaning
  // unauthenticated requests did unnecessary work before being rejected.
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---- Parse + validate body -----------------------------------------------
  let rawPlayerIds: unknown[];
  try {
    const body = await req.json();
    if (!Array.isArray(body.playerIds)) throw new Error();
    rawPlayerIds = body.playerIds;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Every element must be a positive integer. Non-integer values would cause
  // a Postgres type error (surfaces as 500) rather than a clean 400 if left
  // unchecked. Floats like 1.5 would also pass Number.isInteger, so we
  // explicitly require integers that are finite and greater than zero.
  const allIntegers = rawPlayerIds.every(
    id => typeof id === 'number' && Number.isInteger(id) && id > 0
  );
  if (!allIntegers) {
    return NextResponse.json(
      { error: 'All player IDs must be positive integers.' },
      { status: 400 }
    );
  }

  // Deduplicate — a caller sending [1, 1, 2, 3] would otherwise pass the
  // length check, insert duplicate match_players rows, and corrupt team arrays.
  // We deduplicate silently rather than erroring because the practical cause
  // is always a UI bug, not a malicious request.
  const playerIds: number[] = [...new Set(rawPlayerIds as number[])];

  if (playerIds.length < 3) {
    return NextResponse.json(
      { error: 'At least 3 distinct players are required.' },
      { status: 400 }
    );
  }

  // ---- Validate all player IDs exist in one query --------------------------
  // Without this check, unknown IDs either silently create orphaned rows or
  // cause a FK violation that surfaces as a 500. One query for all IDs is
  // cheaper than N individual lookups.
  const existenceRes = await db.query<{ id: number }>(
    `SELECT id FROM users WHERE id = ANY($1::int[])`,
    [playerIds]
  );

  if (existenceRes.rows.length !== playerIds.length) {
    const foundIds  = new Set(existenceRes.rows.map(r => r.id));
    const missing   = playerIds.filter(id => !foundIds.has(id));
    return NextResponse.json(
      { error: `Unknown player IDs: ${missing.join(', ')}` },
      { status: 400 }
    );
  }

  // ---- Transaction: duplicate check + create -------------------------------
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Check for an existing in-progress match with exactly this player set,
    // inside the transaction with FOR UPDATE.
    //
    // Why FOR UPDATE matters here:
    //   Two concurrent requests with the same playerIds will both reach this
    //   SELECT. Without FOR UPDATE, both see no existing match, both proceed
    //   to INSERT, and you get duplicate matches. With FOR UPDATE, the second
    //   request blocks on the lock until the first commits. After the first
    //   commits (with the new match row), the second re-runs this check, finds
    //   the match, and returns { existing: true } rather than creating again.
    //
    // The ANY($1) + COUNT trick:
    //   Inner query 1: counts how many submitted playerIds are in the match
    //   Inner query 2: counts total participants in the match
    //   Both must equal playerIds.length for an exact set match (no subset/superset).
    const existingMatchRes = await client.query<{ id: number }>(
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
       LIMIT 1
       FOR UPDATE`,
      [playerIds, playerIds.length]
    );

    if (existingMatchRes.rows.length > 0) {
      await client.query('COMMIT');
      return NextResponse.json({ id: existingMatchRes.rows[0].id, existing: true });
    }

    // ---- Create match row --------------------------------------------------
    const matchResult = await client.query<{ id: number }>(
      'INSERT INTO matches (created_at) VALUES (NOW()) RETURNING id'
    );
    const matchId = matchResult.rows[0].id;

    // ---- Bulk insert match_players -----------------------------------------
    // The previous version looped with individual INSERT queries — one DB
    // round-trip per player. An unnest-based bulk insert does it in one.
    //
    // unnest($1::int[]) expands the array into a set of rows, letting Postgres
    // handle the iteration rather than the application layer.
    await client.query(
      `INSERT INTO match_players (match_id, user_id, gold)
       SELECT $1, unnest($2::int[]), 0`,
      [matchId, playerIds]
    );

    // ---- Assign teams ------------------------------------------------------
    // Fisher-Yates produces a uniformly random shuffle. The sort-based
    // approach (arr.sort(() => Math.random() - 0.5)) is biased because the
    // comparator is called a variable number of times on the same elements,
    // making some orderings significantly more likely than others.
    const shuffled = [...playerIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const mid   = Math.ceil(shuffled.length / 2);
    const team1 = shuffled.slice(0, mid);
    const teamA = shuffled.slice(mid);

    // ---- Create first game -------------------------------------------------
    const gameResult = await client.query<{ id: number }>(
      `INSERT INTO games (match_id, team_1_members, team_a_members, status)
       VALUES ($1, $2::int[], $3::int[], 'in progress')
       RETURNING id`,
      [matchId, team1, teamA]
    );
    const gameId = gameResult.rows[0].id;

    // ---- Link game back to match -------------------------------------------
    await client.query(
      'UPDATE matches SET game_id = $1 WHERE id = $2',
      [gameId, matchId]
    );

    await client.query('COMMIT');

    return NextResponse.json({ id: matchId, existing: false });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[CREATE_MATCH_ERROR]', err);
    return NextResponse.json({ error: 'Failed to create match.' }, { status: 500 });

  } finally {
    client.release();
  }
}
