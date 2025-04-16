// app/api/match/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '../../../../lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    const matchId = parseInt(id || '');

    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    const matchRes = await db.query(`SELECT * FROM Matches WHERE id = $1`, [matchId]);

    if (matchRes.rows.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

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
      match: matchRes.rows[0],
      players: playersRes.rows,
      games: gamesRes.rows,
    });
  } catch (error) {
    console.error('API error in match/[id]/route.ts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
