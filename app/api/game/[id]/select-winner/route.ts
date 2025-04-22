// app/api/game/[id]/select-winner/route.ts

import { NextRequest } from 'next/server';
import db from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const gameId = parseInt(params.id, 10);
  const { winningTeamId } = await req.json();

  if (!gameId || !['team_1', 'team_a'].includes(winningTeamId)) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
  }

  try {
    await db.query(
      'UPDATE Games SET winning_team_id = $1, status = $2 WHERE id = $3',
      [winningTeamId, 'Auction pending', gameId]
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error updating game winner:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
