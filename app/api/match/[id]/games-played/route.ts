// app/api/match/[id]/games-played/route.ts

import { NextRequest } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const matchId = parseInt(params.id);

  if (isNaN(matchId)) {
    return new Response(JSON.stringify({ message: 'Invalid match ID.' }), { status: 400 });
  }

  const { rows } = await db.query(
    'SELECT COUNT(*) FROM Games WHERE match_id = $1',
    [matchId]
  );

  const gamesPlayed = parseInt(rows[0]?.count || '0', 10);

  return new Response(JSON.stringify({ gamesPlayed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
