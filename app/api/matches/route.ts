// app/api/matches/route.ts
import { NextRequest } from 'next/server';
import db from '../../../lib/db';
import { getSession } from '../../../lib/session';

export async function POST(req: NextRequest) {
  const { playerIds } = await req.json();

  if (!Array.isArray(playerIds) || playerIds.length < 4) {
    return new Response(JSON.stringify({ error: 'At least 4 players are required' }), {
      status: 400,
    });
  }

  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const match = await db.match.create({
    data: {
      created_by: session.user_id,
      match_players: {
        createMany: {
          data: playerIds.map((id: number) => ({
            player_id: id,
            gold: 10000,
          })),
        },
      },
    },
  });

  return new Response(JSON.stringify({ id: match.id }), { status: 200 });
}
