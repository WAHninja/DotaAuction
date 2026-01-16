// app/api/match/[id]/route.ts
import { buildGameSnapshot } from '@/lib/buildGameSnapshot';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const matchId = Number(params.id);

  const snapshot = await buildGameSnapshot(matchId);

  if (!snapshot) {
    return Response.json({ error: 'Match not found' }, { status: 404 });
  }

  return Response.json(snapshot);
}
