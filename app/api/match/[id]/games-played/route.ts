// app/api/match/[id]/games-played/route.ts
import { NextRequest } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const matchId = parseInt(parts[parts.length - 2], 10); // match/[id]/games-played

  if (isNaN(matchId)) {
    return new Response(JSON.stringify({ message: 'Invalid match ID.' }), {
      status: 400,
    });
  }

  try {
    const { rows } = await db.query(
      'SELECT COUNT(*) FROM Games WHERE match_id = $1',
      [matchId]
    );

    const gamesPlayed = parseInt(rows[0]?.count || '0', 10);

    return new Response(JSON.stringify({ gamesPlayed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error fetching games played:', err);
    return new Response(JSON.stringify({ message: 'Server error.' }), {
      status: 500,
    });
  }
}
