// app/api/match/[id]/route.ts
import { NextRequest } from 'next/server';
import { buildGameSnapshot } from '@/lib/buildGameSnapshot';

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const matchId = Number(context.params.id);

  const snapshot = await buildGameSnapshot(matchId);

  if (!snapshot) {
    return new Response(JSON.stringify({ error: 'Match not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(snapshot), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
