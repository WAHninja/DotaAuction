import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import { getMatchChannels } from '@/lib/ably-server';

export async function POST(req: NextRequest, context: any) {
  const client = await db.connect();
  let transactionStarted = false;

  try {
    const gameId = Number(context.params.id);
    if (!Number.isInteger(gameId)) {
      return new Response(JSON.stringify({ message: 'Invalid game ID.' }), { status: 400 });
    }

    const { target_player_id, offer_amount } = await req.json();
    const targetPlayerId = Number(target_player_id);
    const offerAmount = Number(offer_amount);

    if (!Number.isInteger(targetPlayerId) || !Number.isInteger(offerAmount)) {
      return new Response(JSON.stringify({ message: 'Invalid input data.' }), { status: 400 });
    }

    // ---------------- Auth ----------------
    const session = await getSession();
    const userId = session?.userId;
    if (!userId) {
      return new Response(JSON.stringify({ message: 'Not authenticated.' }), { status: 401 });
    }

    // ---------------- Load game (lock) ----------------
    await client.query('BEGIN');
    transactionStarted = true;

    const { rows: gameRows } = await client.query(
      'SELECT * FROM games WHERE id = $1 FOR UPDATE',
      [gameId]
    );

    if (gameRows.length === 0) {
      return new Response(JSON.stringify({ message: 'Game not found.' }), { status: 404 });
    }

    const game = gameRows[0];

    if (game.status !== 'auction pending') {
      return new Response(JSON.stringify({ message: 'Auction is not active.' }), { status: 400 });
    }

    const winningTeamMembers =
      game.winning_team === 'team_a'
        ? game.team_a_members
        : game.team_1_members;

    if (!winningTeamMembers.includes(userId)) {
      return new Response(JSON.stringify({ message: 'Only winning team members can submit offers.' }), { status: 403 });
    }

    // ---------------- Offer limits ----------------
    const { rows: matchGames } = await client.query(
      'SELECT COUNT(*) FROM games WHERE match_id = $1',
      [game.match_id]
    );
    const gamesPlayed = parseInt(matchGames[0].count, 10);

    const minOffer = 250 + gamesPlayed * 200;
    const maxOffer = 2000 + gamesPlayed * 500;

    if (offerAmount < minOffer || offerAmount > maxOffer) {
      return new Response(
        JSON.stringify({ message: `Offer must be between ${minOffer} and ${maxOffer}.` }),
        { status: 400 }
      );
    }

    // ---------------- Prevent duplicates ----------------
    const { rows: existing } = await client.query(
      'SELECT 1 FROM offers WHERE game_id = $1 AND from_player_id = $2',
      [gameId, userId]
    );

    if (existing.length > 0) {
      return new Response(JSON.stringify({ message: 'You have already submitted an offer.' }), { status: 400 });
    }

    // ---------------- Insert offer ----------------
    const { rows: inserted } = await client.query(
      `INSERT INTO offers (game_id, from_player_id, target_player_id, offer_amount, status)
       VALUES ($1,$2,$3,$4,'pending')
       RETURNING id`,
      [gameId, userId, targetPlayerId, offerAmount]
    );

    await client.query('COMMIT');
    transactionStarted = false;

    // ---------------- Realtime signal ----------------
    const { offers: offersChannel } = getMatchChannels(game.match_id);

    await offersChannel.publish('new-offer', {
      gameId,
    });

    return new Response(
      JSON.stringify({ success: true, offerId: inserted[0].id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    if (transactionStarted) await client.query('ROLLBACK');
    console.error('submit-offer error:', err);
    return new Response(JSON.stringify({ message: 'Server error.' }), { status: 500 });
  } finally {
    client.release();
  }
}
