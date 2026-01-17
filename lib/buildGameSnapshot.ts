import db from '@/lib/db';

export async function buildGameSnapshot(matchId: number) {
  const client = await db.connect();

  try {
    // 1. Latest game
    const { rows: games } = await client.query(
      `SELECT * FROM games WHERE match_id = $1 ORDER BY created_at ASC`,
      [matchId]
    );

    if (games.length === 0) return null;

    const latestGame = games[games.length - 1];

    // 2. All match players
    const { rows: players } = await client.query(
      `SELECT mp.user_id AS id, u.username, mp.gold
       FROM match_players mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.match_id = $1`,
      [matchId]
    );

    // 3. Map team members to full objects
    const team_1_players = players.filter(p =>
      latestGame.team_1_members.includes(p.id)
    );
    const team_a_players = players.filter(p =>
      latestGame.team_a_members.includes(p.id)
    );

    // 4. Offers for the latest game
    const { rows: offersRows } = await client.query(
      `SELECT id, from_user_id AS from_player_id, to_user_id AS target_player_id, amount AS offer_amount, status
       FROM offers
       WHERE game_id = $1
       ORDER BY created_at ASC`,
      [latestGame.id]
    );

    return {
      matchId,
      gameId: latestGame.id,
      gameNumber: games.length,
      phase: latestGame.phase,
      winningTeam: latestGame.winning_team,
      team_1_players,
      team_a_players,
      allPlayers: players,
      offers: offersRows,
      createdAt: latestGame.created_at,
    };
  } finally {
    client.release();
  }
}
