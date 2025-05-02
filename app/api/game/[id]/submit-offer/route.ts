// app/api/game/[id]/submit-offer/route.ts

import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';

export async function POST(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const id = url.pathname.split('/').at(-2); // Game ID from route param

  if (!id || isNaN(Number(id))) {
    return new Response(JSON.stringify({ message: 'Invalid game ID.' }), {
      status: 400,
    });
  }

  const gameId = Number(id);
  const { target_player_id, offer_amount } = await req.json();
  const session = await getSession();
  const userId = session?.userId;

  if (!userId) {
    return new Response(JSON.stringify({ message: 'Not authenticated.' }), {
      status: 401,
    });
  }

  // Validate offer amount
  if (offer_amount < 250 || offer_amount > 2000) {
    return new Response(
      JSON.stringify({ message: 'Offer amount must be between 250 and 2000.' }),
      { status: 400 }
    );
  }

  try {
    // Fetch latest game for the match
    const { rows: gameRows } = await db.query(
      'SELECT * FROM Games WHERE id = $1 LIMIT 1',
      [gameId]
    );

    if (gameRows.length === 0) {
      return new Response(JSON.stringify({ message: 'Game not found.' }), {
        status: 404,
      });
    }

    const game = gameRows[0];
    const winningTeam = game.winning_team;
    const teamA = game.team_a_members;
    const team1 = game.team_1_members;

    const winningTeamMembers = winningTeam === 'team_a' ? teamA : team1;

    // Ensure the user hasn't already submitted an offer
    const existing = await db.query(
      'SELECT * FROM Offers WHERE from_player_id = $1 AND game_id = $2',
      [userId, gameId]
    );

    if (existing.rows.length > 0) {
      return new Response(
        JSON.stringify({ message: 'You have already submitted an offer.' }),
        { status: 400 }
      );
    }

    // Insert the new offer
    const { rows: inserted } = await db.query(
      `INSERT INTO Offers (game_id, from_player_id, target_player_id, offer_amount, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [gameId, userId, target_player_id, offer_amount, 'pending']
    );

    return new Response(
      JSON.stringify({ message: 'Offer submitted.', offer: inserted[0] }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Error submitting offer:', err);
    return new Response(
      JSON.stringify({ message: 'Server error.' }),
      { status: 500 }
    );
  }
}
