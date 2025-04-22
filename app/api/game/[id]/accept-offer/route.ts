// app/api/game/[id]/accept-offer/route.ts

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const matchId = params.id;
  const { offerId } = await req.json();

  const session = await getSession();
  const userId = session?.userId;

  if (!userId) {
    return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
  }

  try {
    // Get latest game for the match
    const { rows: gameRows } = await db.query(
      'SELECT * FROM Games WHERE match_id = $1 ORDER BY id DESC LIMIT 1',
      [matchId]
    );
    if (gameRows.length === 0) {
      return NextResponse.json({ message: 'Game not found.' }, { status: 404 });
    }

    const game = gameRows[0];
    const winningTeam = game.winning_team;
    const teamA = game.team_a_members;
    const team1 = game.team_1_members;

    const losingTeamMembers = winningTeam === 'team_a' ? team1 : teamA;

    if (!losingTeamMembers.includes(userId)) {
      return NextResponse.json({ message: 'You are not on the losing team.' }, { status: 403 });
    }

    // Check if offer exists and is pending
    const { rows: offerRows } = await db.query(
      'SELECT * FROM Offers WHERE id = $1 AND game_id = $2 AND status = $3',
      [offerId, game.id, 'pending']
    );
    if (offerRows.length === 0) {
      return NextResponse.json({ message: 'Offer not found or already accepted.' }, { status: 404 });
    }

    // Accept the offer
    const result = await db.query(
      'UPDATE Offers SET status = $1 WHERE id = $2 RETURNING *',
      ['accepted', offerId]
    );

    return NextResponse.json({ message: 'Offer accepted.', offer: result.rows[0] }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}
