import { NextRequest, NextResponse } from 'next/server';
import db from '../../../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const matchId = parseInt(url.pathname.split('/')[3]); // /api/match/[id]/select-winner

    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    const { winningTeamId } = await req.json();

    if (!['team_1', 'team_a'].includes(winningTeamId)) {
      return NextResponse.json({ error: 'Invalid winningTeamId' }, { status: 400 });
    }

    // Get the latest game for the match
    const latestGameRes = await db.query(
      `SELECT * FROM Games WHERE match_id = $1 ORDER BY game_id DESC LIMIT 1`,
      [matchId]
    );

    if (latestGameRes.rows.length === 0) {
      return NextResponse.json({ error: 'No games found for this match' }, { status: 404 });
    }

    const game = latestGameRes.rows[0];

    if (game.status !== 'in progress') {
      return NextResponse.json({ error: 'Game already completed or auction already started' }, { status: 400 });
    }

    // Update game and match
    await db.query(
      `UPDATE Games SET status = 'Auction pending', winning_team_id = $1 WHERE game_id = $2`,
      [winningTeamId, game.game_id]
    );

    await db.query(
      `UPDATE Matches SET winning_team_id = $1 WHERE id = $2`,
      [winningTeamId, matchId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error selecting winning team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
