// app/api/game/[id]/accept-offer/route.ts
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
      [id]
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

    const existingAcceptance = await db.query(
      'SELECT * FROM Offers WHERE game_id = $1 AND status = $2 AND target_player_id = $3',
      [game.id, 'accepted', userId]
    );

    if (existingAcceptance.rows.length > 0) {
      return new Response(JSON.stringify({ message: 'You have already accepted an offer.' }), {
        status: 400,
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

    const accepted = await db.query(
      'UPDATE Offers SET status = $1 WHERE id = $2 RETURNING *',
      ['accepted', offerId]
    );

    await db.query(
      'UPDATE Offers SET status = $1 WHERE game_id = $2 AND id != $3 AND status = $4',
      ['rejected', game.id, offerId, 'pending']
    );

    return new Response(JSON.stringify({ message: 'Offer accepted.', offer: accepted.rows[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error.' }), { status: 500 });
  }
}
