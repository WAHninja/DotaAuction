// app/api/game/[id]/submit-offer/route.ts
import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';

export async function POST(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const id = url.pathname.split('/').at(-2);

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

    if (offerAmount < 250 || offerAmount > 2000) {
      return new Response(
        JSON.stringify({ message: 'Offer amount must be between 250 and 2000.' }),
        { status: 400 }
      );
    }

    const existing = await db.query(
      'SELECT * FROM Offers WHERE from_player_id = $1 AND game_id = $2',
      [userId, game.id]
    );

    if (existing.rows.length > 0) {
      return new Response(
        JSON.stringify({ message: 'You have already submitted an offer.' }),
        { status: 400 }
      );
    }

    const { rows: inserted } = await db.query(
      'INSERT INTO Offers (game_id, from_player_id, target_player_id, offer_amount, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [game.id, userId, targetPlayerId, offerAmount, 'pending']
    );

    return new Response(JSON.stringify({ message: 'Offer submitted.', offer: inserted[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error.' }), { status: 500 });
  }
}
