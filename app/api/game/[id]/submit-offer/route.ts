// app/api/game/[id]/submit-offer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const matchId = params.id;
  const body = await req.json();
  const { offerAmount, targetPlayerId } = body;

  if (offerAmount < 250 || offerAmount > 2000) {
    return NextResponse.json({ message: 'Offer amount must be between 250 and 2000.' }, { status: 400 });
  }

  const session = await getSession();
  const userId = session?.userId;
  if (!userId) {
    return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
  }

  try {
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
    const winningTeamMembers = winningTeam === 'team_a' ? teamA : team1;

    if (!winningTeamMembers.includes(userId)) {
      return NextResponse.json({ message: 'You are not on the winning team.' }, { status: 403 });
    }

    if (!winningTeamMembers.includes(targetPlayerId) || targetPlayerId === userId) {
      return NextResponse.json(
        { message: 'Target player must be a teammate and not yourself.' },
        { status: 400 }
      );
    }

    const existingOffer = await db.query(
      'SELECT * FROM Offers WHERE from_player_id = $1 AND game_id = $2',
      [userId, game.id]
    );
    if (existingOffer.rows.length > 0) {
      return NextResponse.json({ message: 'You have already submitted an offer.' }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO Offers (game_id, from_player_id, target_player_id, offer_amount, status, created_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW())
       RETURNING *`,
      [game.id, userId, targetPlayerId, offerAmount]
    );

    return NextResponse.json({ message: 'Offer submitted.', offer: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}
