// app/api/game/[id]/accept-offer/route.ts
// app/api/game/[id]/accept-offer/route.ts
import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';

export async function POST(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const matchId = url.pathname.split('/').at(-2); // this is still the match ID

  if (!matchId) {
    return new Response(JSON.stringify({ message: 'Missing match ID.' }), {
      status: 400,
    });
  }

  const { offerId } = await req.json();
  const session = await getSession();
  const userId = session?.userId;
  if (!userId) return new Response(JSON.stringify({ message: 'Not authenticated.' }), { status: 401 });

  try {
    // Get the current game
    const { rows: gameRows } = await db.query(
      'SELECT * FROM Games WHERE match_id = $1 ORDER BY id DESC LIMIT 1',
      [matchId]
    );
    if (gameRows.length === 0) return new Response(JSON.stringify({ message: 'Game not found.' }), { status: 404 });
    const game = gameRows[0];

    const teamA = game.team_a_members;
    const team1 = game.team_1_members;
    const winningTeam = game.winning_team;
    const losingTeam = winningTeam === 'team_a' ? team1 : teamA;
    const winningTeamKey = winningTeam === 'team_a' ? 'team_a_members' : 'team_1_members';
    const losingTeamKey = winningTeam === 'team_a' ? 'team_1_members' : 'team_a_members';

    if (!losingTeam.includes(userId)) {
      return new Response(JSON.stringify({ message: 'You are not on the losing team.' }), { status: 403 });
    }

    // Fetch the offer
    const { rows: offerRows } = await db.query(
      'SELECT * FROM Offers WHERE id = $1 AND game_id = $2 AND status = $3',
      [offerId, game.id, 'pending'] // ✅ assuming `game` was fetched just above
    );
    if (offerRows.length === 0) return new Response(JSON.stringify({ message: 'Offer not found or already accepted.' }), { status: 404 });
    const offer = offerRows[0];

    const { from_player_id, target_player_id, offer_amount } = offer;

    await db.query('BEGIN');

    // Accept selected offer
    await db.query('UPDATE Offers SET status = $1 WHERE id = $2', ['accepted', offerId]);

    // Reject all other offers
    await db.query(
      'UPDATE Offers SET status = $1 WHERE game_id = $2 AND id != $3 AND status = $4',
      ['rejected', gameId, offerId, 'pending']
    );

    // Add gold to the offer maker
    await db.query(
      'UPDATE MatchPlayers SET gold = gold + $1 WHERE player_id = $2 AND match_id = $3',
      [offer_amount, from_player_id, game.match_id]
    );

    // Mark current game as finished
    await db.query('UPDATE Games SET status = $1 WHERE id = $2', ['finished', gameId]);

    // Prepare new teams for the next game
    const newTeamA = [...teamA];
    const newTeam1 = [...team1];

    // Move player across teams
    if (teamA.includes(target_player_id)) {
      // Remove from A, add to 1
      const index = newTeamA.indexOf(target_player_id);
      if (index > -1) newTeamA.splice(index, 1);
      newTeam1.push(target_player_id);
    } else if (team1.includes(target_player_id)) {
      const index = newTeam1.indexOf(target_player_id);
      if (index > -1) newTeam1.splice(index, 1);
      newTeamA.push(target_player_id);
    }

    // Create new game
    await db.query(
      `INSERT INTO Games (match_id, team_a_members, team_1_members, status)
       VALUES ($1, $2, $3, 'In progress')`,
      [game.match_id, newTeamA, newTeam1]
    );

    await db.query('COMMIT');

    return new Response(JSON.stringify({ message: 'Offer accepted and new game started.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error.' }), { status: 500 });
  }
}
