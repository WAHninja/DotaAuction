// app/api/match/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '../../../../lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    const matchId = parseInt(id || '');

    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    // Match metadata
    const matchRes = await db.query(`SELECT * FROM Matches WHERE id = $1`, [matchId]);
    if (matchRes.rows.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    const match = matchRes.rows[0];

    // All match players with gold
    const playersRes = await db.query(
      `SELECT p.id, p.username, mp.gold
       FROM match_players mp
       JOIN Players p ON mp.player_id = p.id
       WHERE mp.match_id = $1`,
      [matchId]
    );
    const allPlayers = playersRes.rows;

    // Game history
    const gamesRes = await db.query(
      `SELECT * FROM Games WHERE match_id = $1 ORDER BY game_id ASC`,
      [matchId]
    );
    const games = gamesRes.rows;
    const latestGame = games.at(-1);

    let team1: any[] = [];
    let teamA: any[] = [];
    let offers: any[] = [];

    if (latestGame) {
      const team1Ids: number[] = latestGame.team_1_members;
      const teamAIds: number[] = latestGame.team_a_members;

      // Join team members with their player info
      team1 = allPlayers.filter(p => team1Ids.includes(p.id));
      teamA = allPlayers.filter(p => teamAIds.includes(p.id));

      // If in auction phase, fetch offers
      if (latestGame.status === 'Auction pending') {
        const offersRes = await db.query(
          `SELECT * FROM Offers WHERE game_id = $1`,
          [latestGame.game_id]
        );
        offers = offersRes.rows;
      }
    }

    return NextResponse.json({
      match,
      players: allPlayers,
      games,
      latestGame,
      team1,
      teamA,
      offers,
    });
  } catch (error) {
    console.error('API error in match/[id]/route.ts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
