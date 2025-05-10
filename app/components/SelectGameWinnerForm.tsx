import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db'; // Your PostgreSQL client

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const gameId = parseInt(params.id, 10);
  if (isNaN(gameId)) {
    return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
  }

  const { winningTeamId } = await req.json();

  if (!['team_1', 'team_a'].includes(winningTeamId)) {
    return NextResponse.json({ error: 'Invalid team selection' }, { status: 400 });
  }

  try {
    // Fetch game and match info
    const gameRes = await db.query(`
      SELECT id, match_id, team_1_members, team_a_members
      FROM Games
      WHERE id = $1
    `, [gameId]);

    const game = gameRes.rows[0];
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const losingTeamId = winningTeamId === 'team_1' ? 'team_a' : 'team_1';
    const losingMembers: number[] = game[`${losingTeamId}_members`];

    // Apply 20% penalty to each losing player
    for (const playerId of losingMembers) {
      const goldRes = await db.query(`
        SELECT gold FROM MatchPlayers
        WHERE match_id = $1 AND player_id = $2
      `, [game.match_id, playerId]);

      const currentGold = goldRes.rows[0]?.gold ?? 0;
      const penalty = Math.floor(currentGold * 0.2);

      // Deduct gold
      await db.query(`
        UPDATE MatchPlayers
        SET gold = gold - $1
        WHERE match_id = $2 AND player_id = $3
      `, [penalty, game.match_id, playerId]);

      // Log gold loss
      await db.query(`
        INSERT INTO GamePlayerStats (game_id, player_id, team_id, gold_change, reason)
        VALUES ($1, $2, $3, $4, 'loss_penalty')
      `, [gameId, playerId, losingTeamId, -penalty]);
    }

    // Update game status and winner
    await db.query(`
      UPDATE Games
      SET status = 'Auction pending', winning_team_id = $1
      WHERE id = $2
    `, [winningTeamId, gameId]);

    return NextResponse.json({ message: 'Winner set and gold penalty applied' });
  } catch (err) {
    console.error('Error selecting winner:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
