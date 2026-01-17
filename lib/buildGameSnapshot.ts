// lib/buildGameSnapshot.ts
import db from '@/lib/db';

export async function buildGameSnapshot(matchId: number) {
  const client = await db.connect();

  try {
    // 1. Fetch all games in this match, oldest first
    const { rows: games } = await client.query(
      `SELECT * FROM games WHERE match_id = $1 ORDER BY created_at ASC`,
      [matchId]
    );

    if (games.length === 0) return null;

    const latestGame = games[games.length - 1];

    // 2. Fetch all players in this match
    const { rows: players } = await client.query(
      `SELECT mp.user_id AS id, u.username, mp.gold
       FROM match_players mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.match_id = $1`,
      [matchId]
    );

    // 3. Map players to each team
    const team_1_players = players.filter(p =>
      latestGame.team_1_members.includes(p.id)
    );
    const team_a_players = players.filter(p =>
      latestGame.team_a_members.includes(p.id)
    );

    // 4. Fetch all offers for the latest game
    const { rows: offers } = await client.query(
      `SELECT id, from_player_id, target_player_id, offer_amount, status
       FROM offers
       WHERE game_id = $1
       ORDER BY created_at ASC`,
      [latestGame.id]
    );

    // 5. Build and return snapshot
    return {
      matchId,
      gameId: latestGame.id,
      gameNumber: games.length,
      phase: latestGame.phase,
      winningTeam: latestGame.winning_team,

      team_1_players,
      team_a_players,
      allPlayers: players,

      offers,
      createdAt: latestGame.created_at,
    };
  } finally {
    client.release();
  }
}
