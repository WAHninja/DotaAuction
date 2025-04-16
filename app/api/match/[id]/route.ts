// app/api/match/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '../../../../lib/db';

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const matchId = parseInt(context.params.id);

    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    const matchRes = await db.query(
      `SELECT * FROM Matches WHERE id = $1`,
      [matchId]
    );

    if (matchRes.rows.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const match = matchRes.rows[0];

    // If you want to include players or game data too, here's where you’d join or query more tables
    // Example: Fetch players for the match
    const playersRes = await db.query(
      `SELECT p.id, p.username, mp.gold
       FROM MatchPlayers mp
       JOIN Players p ON mp.player_id = p.id
       WHERE mp.match_id = $1`,
      [matchId]
    );

    const gamesRes = await db.query(
      `SELECT * FROM Games WHERE match_id = $1 ORDER BY game_id ASC`,
      [matchId]
    );

    return NextResponse.json({
      match,
      players: playersRes.rows,
      games: gamesRes.rows,
    });
  } catch (error) {
    console.error('Error fetching match details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
