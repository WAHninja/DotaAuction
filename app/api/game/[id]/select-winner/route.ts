// app/api/game/[id]/select-winner/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import ablyClient from '@/lib/ably-client'; // ✅ correct import

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const gameId = parseInt(url.pathname.split('/')[3]); // /api/game/[id]/select-winner

    if (isNaN(gameId)) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
    }

    const { winningTeamId } = await req.json();

    if (!['team_1', 'team_a'].includes(winningTeamId)) {
      return NextResponse.json({ error: 'Invalid winningTeamId' }, { status: 400 });
    }

    // Get the game
    const gameRes = await db.query(
      `SELECT * FROM Games WHERE id = $1`,
      [gameId]
    );

    if (gameRes.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = gameRes.rows[0];

    if (game.status !== 'In progress') {
      return NextResponse.json({ error: 'Game already completed or auction already started' }, { status: 400 });
    }

    // Update the game status and winning team
    await db.query(
      `UPDATE Games SET status = 'Auction pending', winning_team = $1 WHERE id = $2`,
      [winningTeamId, gameId]
    );

    // ✅ Publish the update to Ably
    const ably = await ablyClient;
    const channel = ably.channels.get('match-' + game.match_id);
    await channel.publish('game-winner-selected', {
      gameId,
      matchId: game.match_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error selecting winning team for game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
