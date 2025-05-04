// app/api/game/[id]/submit-offer/route.ts

import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import * as Ably from 'ably/promises';

const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

await ably.channels
  .get(`match-${matchId}-offers`)
  .publish('new-offer', savedOffer);

export async function POST(req: NextRequest): Promise<Response> {
  const body = await req.json(); // ✅ parse body first!
  const { target_player_id, offer_amount } = body;

  const url = new URL(req.url);
  const id = url.pathname.split('/').at(-2); // Game ID from route param

  if (!id || isNaN(Number(id))) {
    return new Response(JSON.stringify({ message: 'Invalid game ID.' }), {
      status: 400,
    });
  }

  const gameId = Number(id);
  const session = await getSession();
  const userId = session?.userId;

  if (!userId) {
    return new Response(JSON.stringify({ message: 'Not authenticated.' }), {
      status: 401,
    });
  }

  if (offer_amount < 250 || offer_amount > 2000) {
    return new Response(
      JSON.stringify({ message: 'Offer amount must be between 250 and 2000.' }),
      { status: 400 }
    );
  }

  try {
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
