// app/api/game/[id]/accept-offer/route.ts
import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';

// Correct typing for App Router
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  const matchId = params.id;
  const { offerId } = await req.json();

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
      [matchId]
    );
    if (gameRows.length === 0) {
      return new Response(JSON.stringify({ message: 'Game not found.' }), { status: 404 });
    }

    const game = gameRows[0];
    const winningTeam = game.winning_team;
    const teamA = game.team_a_members;
    const team1 = game.team_1_members;

    const losingTeamMembers = winningTeam === 'team_a' ? team1 : teamA;

    if (!losingTeamMembers.includes(userId)) {
      return new Response(JSON.stringify({ message: 'You are not on the losing team.' }), {
        status: 403,
      });
    }

    const { rows: offerRows } = await db.query(
      'SELECT * FROM Offers WHERE id = $1 AND game_id = $2 AND status = $3',
      [offerId, game.id, 'pending']
    );
    if (offerRows.length === 0) {
      return new Response(JSON.stringify({ message: 'Offer not found or already accepted.' }), {
        status: 404,
      });
    }

    const result = await db.query(
      'UPDATE Offers SET status = $1 WHERE id = $2 RETURNING *',
      ['accepted', offerId]
    );

    return new Response(JSON.stringify({ message: 'Offer accepted.', offer: result.rows[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error.' }), { status: 500 });
  }
}
