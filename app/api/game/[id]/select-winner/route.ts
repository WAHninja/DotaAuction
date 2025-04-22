import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const gameId = parseInt(params.id);

  if (isNaN(gameId)) {
    return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
  }

  const { winningTeamId } = await req.json();

  if (winningTeamId !== 'team_1' && winningTeamId !== 'team_a') {
    return NextResponse.json({ error: 'Invalid team selection' }, { status: 400 });
  }

  try {
    // Get the game and check status
    const gameRes = await db.query(
      'SELECT id, status FROM Games WHERE id = $1',
      [gameId]
    );

    const game = gameRes.rows[0];

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'In progress') {
      return NextResponse.json({ error: 'Cannot update a game that is not in progress' }, { status: 400 });
    }

    // Update the game
    await db.query(
      `UPDATE Games
       SET winning_team_id = $1,
           status = 'Auction pending'
       WHERE id = $2`,
      [winningTeamId, gameId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error selecting game winner:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
