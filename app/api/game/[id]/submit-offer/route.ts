// app/api/game/[id]/submit-offer/route.ts
import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import { getAblyServer, getMatchChannels } from '@/lib/ably';

export async function POST(req: NextRequest, context: any) {
  try {
    const body = await req.json();
    const target_player_id = Number(body.target_player_id);
    const offer_amount = Number(body.offer_amount);
    const gameId = Number(context.params.id);

    if (isNaN(target_player_id) || isNaN(offer_amount) || isNaN(gameId)) {
      return new Response(JSON.stringify({ message: 'Invalid input data.' }), { status: 400 });
    }

    const session = await getSession();
    const userId = session?.userId;
    if (!userId) return new Response(JSON.stringify({ message: 'Not authenticated.' }), { status: 401 });

    // Fetch the game
    const { rows: gameRows } = await db.query('SELECT * FROM games WHERE id = $1 LIMIT 1', [gameId]);
    if (gameRows.length === 0) return new Response(JSON.stringify({ message: 'Game not found.' }), { status: 404 });
    const game = gameRows[0];

    // Only allow winning team members to submit offers
    const winningTeamMembers = game.winning_team === 'team_a' ? game.team_a_members : game.team_1_members;
    if (!winningTeamMembers.includes(userId)) {
      return new Response(JSON.stringify({ message: 'Only winning team members can submit offers.' }), { status: 403 });
    }

    // Get matchId
    const { rows: matchRows } = await db.query('SELECT match_id FROM games WHERE id = $1', [gameId]);
    const matchId = matchRows[0]?.match_id;
    if (!matchId) return new Response(JSON.stringify({ message: 'Match not found.' }), { status: 404 });

    // Calculate offer limits based on games played
    const { rows: matchGames } = await db.query('SELECT COUNT(*) FROM games WHERE match_id = $1', [matchId]);
    const gamesPlayed = parseInt(matchGames[0].count, 10);
    const minOfferAmount = 250 + gamesPlayed * 200;
    const maxOfferAmount = 2000 + gamesPlayed * 500;
    if (offer_amount < minOfferAmount || offer_amount > maxOfferAmount) {
      return new Response(JSON.stringify({ message: `Offer must be between ${minOfferAmount} and ${maxOfferAmount}.` }), { status: 400 });
    }

    // Check if user already submitted an offer
    const { rows: existingOffers } = await db.query(
      'SELECT 1 FROM offers WHERE from_player_id = $1 AND game_id = $2',
      [userId, gameId]
    );
    if (existingOffers.length > 0) {
      return new Response(JSON.stringify({ message: 'You have already submitted an offer.' }), { status: 400 });
    }

    // Insert the new offer
    const { rows: inserted } = await db.query(
      `INSERT INTO offers (game_id, from_player_id, target_player_id, offer_amount, status)
       VALUES ($1,$2,$3,$4,'pending') RETURNING *`,
      [gameId, userId, target_player_id, offer_amount]
    );
    const offer = inserted[0];

    // ---------------- Publish Realtime ----------------
    const ably = getAblyServer();
    const { offers: offersChannel, game: gameChannel } = getMatchChannels(matchId);

    // Fetch all current offers for this game
    const { rows: allOffers } = await db.query(
      'SELECT * FROM offers WHERE game_id = $1 ORDER BY created_at ASC',
      [gameId]
    );

    // Publish new-offer event (can be used for UI toast notifications)
    await offersChannel.publish('new-offer', { offer });
    console.log('📡 new-offer published');

    // Publish game-updated event with full offers array
    await gameChannel.publish('game-updated', {
      gameId,
      status: game.status,
      offers: allOffers,
    });
    console.log('📡 game-updated published');

    return new Response(JSON.stringify({ message: 'Offer submitted.', offer }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Error submitting offer:', err);
    return new Response(JSON.stringify({ message: 'Server error.' }), { status: 500 });
  }
}
