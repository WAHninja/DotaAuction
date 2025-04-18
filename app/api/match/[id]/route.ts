// app/api/match/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '../../../../lib/db';

function safeParseArray(value: any): number[] {
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value || '[]');
  } catch {
    console.error('Failed to parse array:', value);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    const matchId = parseInt(id || '');

    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    // Fetch match metadata
    const matchResult = await db.query(`SELECT * FROM Matches WHERE id = $1`, [matchId]);
    if (matchResult.rows.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    const match = matchResult.rows[0];

    // Fetch all players with their gold
    const playersResult = await db.query(
      `SELECT p.id, p.username, mp.gold
       FROM match_players mp
       JOIN users p ON mp.user_id = p.id
       WHERE mp.match_id = $1`,
      [matchId]
    );
    const allPlayers = playersResult.rows;

    // Fetch games
    const gamesResult = await db.query(
      `SELECT * FROM Games WHERE match_id = $1 ORDER BY id ASC`,
      [matchId]
    );
    const games = gamesResult.rows;
    const latestGame = games.at(-1);

    let team1: any[] = [];
    let teamA: any[] = [];
    let offers: any[] = [];

    if (latestGame) {
      const team1Ids = safeParseArray(latestGame.team_1_members);
      const teamAIds = safeParseArray(latestGame.team_a_members);

      team1 = allPlayers.filter((p) => team1Ids.includes(p.id));
      teamA = allPlayers.filter((p) => teamAIds.includes(p.id));

      if (latestGame.status === 'Auction pending') {
        const offersResult = await db.query(
          `SELECT * FROM Offers WHERE game_id = $1`,
          [latestGame.game_id]
        );
        offers = offersResult.rows;
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
