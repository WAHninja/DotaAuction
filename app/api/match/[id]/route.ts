// app/api/match/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';

function safeParseArray(value: any): number[] {
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value || '[]');
  } catch {
    console.error('Failed to parse array:', value);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const currentUserId = session?.userId;

    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    const matchId = parseInt(id || '');

    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    // Get match
    const matchRes = await db.query(`SELECT * FROM Matches WHERE id = $1`, [matchId]);
    if (matchRes.rowCount === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    const match = matchRes.rows[0];

    // Get players
    const playersRes = await db.query(
      `SELECT u.id, u.username, mp.gold
       FROM match_players mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.match_id = $1`,
      [matchId]
    );
    const players = playersRes.rows;

    // Get games
    const gamesRes = await db.query(
      `SELECT * FROM Games WHERE match_id = $1 ORDER BY id ASC`,
      [matchId]
    );
    const games = gamesRes.rows;
    const latestGame = games.at(-1) || null;

    // Get offers if auction pending
    let offers = [];
    if (latestGame?.status === 'Auction pending') {
      const offersRes = await db.query(
        `SELECT * FROM Offers WHERE game_id = $1`,
        [latestGame.game_id]
      );
      offers = offersRes.rows;
    }

    return NextResponse.json({
      match,
      players,
      games,
      latestGame,
      offers,
      currentUserId, // ✅ included for frontend
    });
  } catch (error) {
    console.error('API error in match/[id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
