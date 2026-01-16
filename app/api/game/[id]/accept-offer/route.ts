// app/api/game/[id]/accept-offer/route.ts
import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import { getMatchChannels } from '@/lib/ably-server';
import { buildGameSnapshot } from '@/lib/buildGameSnapshot';

export async function POST(req: NextRequest, context: any) {
  const client = await db.connect();
  let tx = false;

  try {
    const gameId = Number(context.params.id);
    if (!Number.isInteger(gameId)) {
      return Response.json({ error: 'Invalid game ID' }, { status: 400 });
    }

    const { offerId } = await req.json();
    if (!Number.isInteger(Number(offerId))) {
      return Response.json({ error: 'Invalid offer ID' }, { status: 400 });
    }

    // ---------------- Auth ----------------
    const session = await getSession();
    const userId = session?.userId;
    if (!userId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await client.query('BEGIN');
    tx = true;

    // ---------------- Lock game ----------------
    const { rows: gameRows } = await client.query(
      `SELECT * FROM games WHERE id = $1 FOR UPDATE`,
      [gameId]
    );

    if (gameRows.length === 0) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = gameRows[0];

    if (game.phase !== 'auction') {
      return Response.json({ error: 'Auction not active' }, { status: 400 });
    }

    const winningTeam = game.winning_team;
    const losingTeam =
      winningTeam === 'team_a'
        ? game.team_1_members
        : game.team_a_members;

    if (!losingTeam.includes(userId)) {
      return Response.json(
        { error: 'Only losing team members can accept offers' },
        { status: 403 }
      );
    }

    // ---------------- Lock offer ----------------
    const { rows: offerRows } = await client.query(
      `SELECT * FROM offers
       WHERE id = $1 AND game_id = $2 AND status = 'pending'
       FOR UPDATE`,
      [offerId, gameId]
    );

    if (offerRows.length === 0) {
      return Response.json(
        { error: 'Offer not found or already processed' },
        { status: 404 }
      );
    }

    const offer = offerRows[0];
    const { from_player_id, target_player_id, offer_amount } = offer;

    // ---------------- Accept + reject ----------------
    await client.query(
      `UPDATE offers SET status = 'accepted' WHERE id = $1`,
      [offerId]
    );

    await client.query(
      `UPDATE offers
       SET status = 'rejected'
       WHERE game_id = $1 AND id != $2 AND status = 'pending'`,
      [gameId, offerId]
    );

    // ---------------- Apply gold ----------------
    await client.query(
      `UPDATE match_players
       SET gold = gold + $1
       WHERE match_id = $2 AND user_id = $3`,
      [offer_amount, game.match_id, from_player_id]
    );

    // ---------------- Finish game ----------------
    await client.query(
      `UPDATE games
       SET phase = 'completed'
       WHERE id = $1`,
      [gameId]
    );

    // ---------------- Create next game ----------------
    const teamA = [...game.team_a_members];
    const team1 = [...game.team_1_members];

    if (teamA.includes(target_player_id)) {
      teamA.splice(teamA.indexOf(target_player_id), 1);
      team1.push(target_player_id);
    } else {
      team1.splice(team1.indexOf(target_player_id), 1);
      teamA.push(target_player_id);
    }

    await client.query(
      `INSERT INTO games
       (match_id, team_a_members, team_1_members, phase)
       VALUES ($1,$2,$3,'in_progress')`,
      [game.match_id, teamA, team1]
    );

    await client.query('COMMIT');
    tx = false;

    // ---------------- Publish snapshot ----------------
    const snapshot = await buildGameSnapshot(game.match_id);
    const { game: channel } = getMatchChannels(game.match_id);

    await channel.publish('snapshot', snapshot);

    return Response.json({ success: true });
  } catch (err) {
    if (tx) await client.query('ROLLBACK');
    console.error('accept-offer error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
