import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import { publishToMatchChannel } from '@/lib/publishToMatchChannel';

export async function POST(req: NextRequest): Promise<Response> {
  let transactionStarted = false;

  try {
    // ---------------- Parse game ID ----------------
    const url = new URL(req.url);
    const gameId = Number(url.pathname.split('/')[3]); // /api/game/{id}/accept-offer
    if (isNaN(gameId)) {
      return new Response(JSON.stringify({ message: 'Invalid game ID.' }), {
        status: 400,
      });
    }

    // ---------------- Parse offer ID ----------------
    const { offerId } = await req.json();
    if (!offerId || isNaN(Number(offerId))) {
      return new Response(JSON.stringify({ message: 'Invalid offer ID.' }), {
        status: 400,
      });
    }

    // ---------------- Authenticate ----------------
    const session = await getSession();
    const userId = session?.userId;
    if (!userId) {
      return new Response(JSON.stringify({ message: 'Not authenticated.' }), {
        status: 401,
      });
    }

    // ---------------- Fetch Game ----------------
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
    const teamA: number[] = game.team_a_members;
    const team1: number[] = game.team_1_members;
    const winningTeam = game.winning_team;

    const losingTeam = winningTeam === 'team_a' ? team1 : teamA;
    if (!losingTeam.includes(userId)) {
      return new Response(
        JSON.stringify({ message: 'Only losing team members can accept offers.' }),
        { status: 403 }
      );
    }

    // ---------------- Fetch Offer ----------------
    const { rows: offerRows } = await db.query(
      'SELECT * FROM Offers WHERE id = $1 AND game_id = $2 AND status = $3',
      [offerId, gameId, 'pending']
    );
    if (offerRows.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Offer not found or already accepted.' }),
        { status: 404 }
      );
    }

    const offer = offerRows[0];
    const { from_player_id, target_player_id, offer_amount } = offer;

    // ---------------- Begin Transaction ----------------
    await db.query('BEGIN');
    transactionStarted = true;

    // Accept the offer
    await db.query('UPDATE Offers SET status = $1 WHERE id = $2', [
      'accepted',
      offerId,
    ]);

    // Reject all other pending offers for this game
    await db.query(
      'UPDATE Offers SET status = $1 WHERE game_id = $2 AND id != $3 AND status = $4',
      ['rejected', gameId, offerId, 'pending']
    );

    // Update gold for offering player
    await db.query(
      'UPDATE match_players SET gold = gold + $1 WHERE user_id = $2 AND match_id = $3',
      [offer_amount, from_player_id, game.match_id]
    );

    // Track gold change
    await db.query(
      `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
       VALUES ($1, $2, $3, $4, 'offer_gain')`,
      [gameId, from_player_id, winningTeam, offer_amount]
    );

    // Finish current game
    await db.query('UPDATE Games SET status = $1 WHERE id = $2', [
      'finished',
      gameId,
    ]);

    // ---------------- Swap Target Player ----------------
    const newTeamA = [...teamA];
    const newTeam1 = [...team1];

    if (teamA.includes(target_player_id)) {
      newTeamA.splice(newTeamA.indexOf(target_player_id), 1);
      newTeam1.push(target_player_id);
    } else if (team1.includes(target_player_id)) {
      newTeam1.splice(newTeam1.indexOf(target_player_id), 1);
      newTeamA.push(target_player_id);
    }

    const { rows: newGameRows } = await db.query(
      `INSERT INTO Games (match_id, team_a_members, team_1_members, status)
       VALUES ($1, $2, $3, 'in progress') RETURNING *`,
      [game.match_id, newTeamA, newTeam1]
    );

    await db.query('COMMIT');
    transactionStarted = false;

    // ---------------- Notify via Ably ----------------
     await publishToMatchChannel(game.match_id, 'offer-accepted', {
        acceptedOffer: offer,
        newGame: newGameRows[0],
      });

    return new Response(
      JSON.stringify({
        message: 'Offer accepted and new game started.',
        acceptedOffer: offer,
        newGame: newGameRows[0],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    if (transactionStarted) {
      await db.query('ROLLBACK');
    }
    console.error('Error accepting offer:', err);
    return new Response(JSON.stringify({ message: 'Server error.' }), {
      status: 500,
    });
  }
}
