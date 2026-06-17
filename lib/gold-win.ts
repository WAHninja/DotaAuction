// lib/gold-win.ts
//
// Shared helper for the 100,000 gold match-win condition.
//
// Called inside an open transaction immediately after any gold-modifying
// write, so the values read here are the post-write values within that
// transaction — no separate re-fetch needed.
//
// If two players cross the threshold simultaneously (e.g. both receive
// win-reward gold in the same distribution pass), the one with the higher
// gold total wins. user_id ASC breaks exact ties deterministically.

import type { PoolClient } from 'pg';

export const GOLD_WIN_THRESHOLD = 100_000;

export async function checkGoldThresholdWin(
  matchId: number,
  client: PoolClient,
): Promise<{ winnerId: number } | null> {
  const { rows } = await client.query<{ user_id: number }>(
    `SELECT user_id
     FROM match_players
     WHERE match_id = $1
       AND gold >= $2
     ORDER BY gold DESC, user_id ASC
     LIMIT 1`,
    [matchId, GOLD_WIN_THRESHOLD],
  );

  if (rows.length === 0) return null;
  return { winnerId: rows[0].user_id };
}
