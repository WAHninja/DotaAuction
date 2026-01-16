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

    const { offerId } = await req.json();
    if (!Number.isInteger(Number(offerId))) {
      return new Response(JSON.stringify({ message: 'Invalid offer ID.' }), { status: 400 });
    }

    // ---------------- Auth ----------------
    const session = await getSession();
    const userId = session?.userId;
    if (!userId) {
      return new Response(JSON.stringify({ message: 'Not authenticated.' }), { status: 401 });
    }

    // ---------------- Begin transaction ----------------
    await client.query('BEGIN');
    transactionStarted = true;

    // ---------------- Load game (lock) ----------------
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

    const teamA: number[] = game.team_a_members;
    const team1: number[] = game.team_1_members;
    const winningTeam = game.winning_team;
    const losingTeam = winningTeam === 'team_a' ? team1 : teamA;

    if (!losingTeam.includes(userId)) {
      return new Response(JSON.stringify({ message: 'Only losing team members can accept offers.' }), { status: 403 });
    }

    // ---------------- Load offer (lock) ----------------
    const { rows: offerRows } = await client.query(
      'SELECT * FROM offers WHERE id = $1 AND game_id = $2 AND status = $3 FOR UPDATE',
      [offerId, gameId, 'pending']
    );
    if (offerRows.length === 0) {
      return new Response(JSON.stringify({ message: 'Offer not found or already processed.' }), { status: 404 });
    }

    const offer = offerRows[0];
    const { from_player_id, target_player_id, offer_amount } = offer;

    // ---------------- Accept & reject offers ----------------
    await client.query(
      'UPDATE offers SET status = $1 WHERE id = $2',
      ['accepted', offerId]
    );

    await client.query(
      'UPDATE offers SET status = $1 WHERE game_id = $2 AND id != $3 AND status = $4',
      ['rejected', gameId, offerId, 'pending']
    );

    // ---------------- Apply gold ----------------
    await client.query(
      'UPDATE match_players SET gold = gold + $1 WHERE user_id = $2 AND match_id = $3',
      [offer_amount, from_player_id, game.match_id]
    );

    await client.query(
      `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
       VALUES ($1,$2,$3,$4,'offer_gain')`,
      [gameId, from_player_id, winningTeam, offer_amount]
    );

    // ---------------- Finish current game ----------------
    await client.query(
      'UPDATE games SET status = $1 WHERE id = $2',
      ['finished', gameId]
    );

    // ---------------- Create next game ----------------
    const newTeamA = [...teamA];
    const newTeam1 = [...team1];

    if (newTeamA.includes(target_player_id)) {
      newTeamA.splice(newTeamA.indexOf(target_player_id), 1);
      newTeam1.push(target_player_id);
    } else {
      newTeam1.splice(newTeam1.indexOf(target_player_id), 1);
      newTeamA.push(target_player_id);
    }

    const { rows: newGameRows } = await client.query(
      `INSERT INTO games (match_id, team_a_members, team_1_members, status)
       VALUES ($1,$2,$3,'in progress')
       RETURNING id`,
      [game.match_id, newTeamA, newTeam1]
    );

    const newGameId = newGameRows[0].id;

    await client.query('COMMIT');
    transactionStarted = false;

    // ---------------- Realtime signals ----------------
    const { offers: offersChannel, game: gameChannel } =
      getMatchChannels(game.match_id);

    await offersChannel.publish('offer-accepted', {
      gameId,
    });

    await gameChannel.publish('game-created', {
      gameId: newGameId,
    });

    return new Response(
      JSON.stringify({ success: true, newGameId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    if (transactionStarted) await client.query('ROLLBACK');
    console.error('accept-offer error:', err);
    return new Response(JSON.stringify({ message: 'Server error.' }), { status: 500 });
  } finally {
    client.release();
  }
}
