import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import { publishToMatchChannel } from '@/utils/publishToMatchChannel';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // ---------------- Parse Input ----------------
    const body = await req.json();
    const target_player_id = Number(body.target_player_id);
    const offer_amount = Number(body.offer_amount);

    if (isNaN(target_player_id) || isNaN(offer_amount)) {
      return new Response(
        JSON.stringify({ message: 'Invalid input data.' }),
        { status: 400 }
      );
    }

    // ---------------- Parse game ID from URL ----------------
    const url = new URL(req.url);
    const gameId = Number(url.pathname.split('/')[3]); // /api/game/{id}/submit-offer
    if (isNaN(gameId)) {
      return new Response(JSON.stringify({ message: 'Invalid game ID.' }), {
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
    const winningTeam = game.winning_team;
    const winningTeamMembers =
      winningTeam === 'team_a' ? game.team_a_members : game.team_1_members;

    if (!winningTeamMembers.includes(userId)) {
      return new Response(
        JSON.stringify({
          message: 'Only winning team members can submit offers.',
        }),
        { status: 403 }
      );
    }

    // ---------------- Fetch Match & Games Played ----------------
    const { rows: matchRows } = await db.query(
      'SELECT match_id FROM Games WHERE id = $1',
      [gameId]
    );
    const matchId = matchRows[0]?.match_id;
    if (!matchId) {
      return new Response(JSON.stringify({ message: 'Match not found.' }), {
        status: 404,
      });
    }

    const { rows: matchGames } = await db.query(
      'SELECT COUNT(*) FROM Games WHERE match_id = $1',
      [matchId]
    );
    const gamesPlayed = parseInt(matchGames[0].count, 10);

    // ---------------- Validate Offer ----------------
    const minOfferAmount = 250 + gamesPlayed * 200;
    const maxOfferAmount = 2000 + gamesPlayed * 500;

    if (offer_amount < minOfferAmount || offer_amount > maxOfferAmount) {
      return new Response(
        JSON.stringify({
          message: `Offer amount must be between ${minOfferAmount} and ${maxOfferAmount}.`,
        }),
        { status: 400 }
      );
    }

    const { rows: existingOffers } = await db.query(
      'SELECT * FROM Offers WHERE from_player_id = $1 AND game_id = $2',
      [userId, gameId]
    );
    if (existingOffers.length > 0) {
      return new Response(
        JSON.stringify({ message: 'You have already submitted an offer.' }),
        { status: 400 }
      );
    }

    // ---------------- Insert Offer ----------------
    const { rows: inserted } = await db.query(
      `INSERT INTO Offers (game_id, from_player_id, target_player_id, offer_amount, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [gameId, userId, target_player_id, offer_amount, 'pending']
    );

    const savedOffer = inserted[0];

    // ---------------- Publish via Ably ----------------
    await publishToMatchChannel(matchId, 'new-offer', savedOffer);

    // ---------------- Return Response ----------------
    return new Response(
      JSON.stringify({ message: 'Offer submitted.', offer: savedOffer }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Error submitting offer:', err);
    return new Response(JSON.stringify({ message: 'Server error.' }), {
      status: 500,
    });
  }
}
