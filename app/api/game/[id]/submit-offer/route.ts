// app/api/game/[id]/submit-offer/route.ts
import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';

export async function POST(req: NextRequest): Promise<Response> {
  // ✅ Extract ID from URL path
  const url = new URL(req.url);
  const id = url.pathname.split('/').at(-2); // e.g. `/api/game/123/submit-offer`

  if (!id) {
    return new Response(JSON.stringify({ message: 'Missing game ID.' }), {
      status: 400,
    });
  }

  const { targetPlayerId, offerAmount } = await req.json();
  const session = await getSession();
  const userId = session?.userId;

  if (!userId) {
    return new Response(JSON.stringify({ message: 'Not authenticated.' }), {
      status: 401,
    });
  }

  try {
    const { rows: gameRows } = await db.query(
      'SELECT * FROM Games WHERE match_id = $1 ORDER BY id DESC LIMIT 1',
      [id]
    );
    if (gameRows.length === 0) {
      return new Response(JSON.stringify({ message: 'Game not found.' }), { status: 404 });
    }

    const game = gameRows[0];
    const winningTeam = game.winning_team;
    const teamA = game.team_a_members;
    const team1 = game.team_1_members;

    const winningTeamMembers = winningTeam === 'team_a' ? teamA : team1;

    if (!winningTeamMembers.includes(userId)) {
      return new Response(JSON.stringify({ message: 'You are not on the winning team.' }), {
        status: 403,
      });
