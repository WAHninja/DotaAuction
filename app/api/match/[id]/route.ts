// app/api/match/[id]/route.ts
import { db } from '../../../lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const matchId = parseInt(params.id);

  if (isNaN(matchId)) {
    return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
  }

  // Get match info
  const match = await db.query(`
    SELECT * FROM Matches WHERE id = $1
  `, [matchId]);

  if (match.rowCount === 0) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  // Get latest game
  const latestGame = await db.query(`
    SELECT * FROM Games WHERE match_id = $1 ORDER BY game_id DESC LIMIT 1
  `, [matchId]);

  // Get players in the match
  const playersRes = await db.query(`
    SELECT p.id, p.username, mp.gold
    FROM MatchPlayers mp
    JOIN Players p ON p.id = mp.player_id
    WHERE mp.match_id = $1
  `, [matchId]);

  return NextResponse.json({
    match: match.rows[0],
    latestGame: latestGame.rows[0] || null,
    players: playersRes.rows,
  });
}
