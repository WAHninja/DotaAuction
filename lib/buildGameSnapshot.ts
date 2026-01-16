// lib/buildGameSnapshot.ts
import db from '@/lib/db';

export async function buildGameSnapshot(matchId: number) {
  const client = await db.connect();

  try {
    // 1. Latest game
    const gameRes = await client.query(
      `
      SELECT *
      FROM games
      WHERE match_id = $1
      ORDER BY created_at ASC
      `,
      [matchId]
    );

    if (gameRes.rows.length === 0) return null;

    const games = gameRes.rows;
    const game = games[games.length - 1];

    // 2. Offers
    const offersRes = await client.query(
      `
      SELECT id, from_user_id, to_user_id, amount, status
      FROM offers
      WHERE game_id = $1
      ORDER BY created_at ASC
      `,
      [game.id]
    );

    return {
      matchId,
      gameId: game.id,
      gameNumber: games.length,

      phase: game.phase,
      winningTeam: game.winning_team,

      team1: game.team_1_members,
      teamA: game.team_a_members,

      offers: offersRes.rows,

      createdAt: game.created_at,
    };
  } finally {
    client.release();
  }
}
