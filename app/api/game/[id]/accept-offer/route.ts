import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import { ablyServer } from '@/lib/ably'; // 👈 ADD THIS

export async function POST(req: NextRequest): Promise<Response> {
  let transactionStarted = false;

  try {
    const url = new URL(req.url);
    const gameId = Number(url.pathname.split('/')[3]);
    if (isNaN(gameId)) {
      return new Response(JSON.stringify({ message: 'Invalid game ID.' }), { status: 400 });
    }

    const { offerId } = await req.json();
    if (!offerId || isNaN(Number(offerId))) {
      return new Response(JSON.stringify({ message: 'Invalid offer ID.' }), { status: 400 });
    }

    const session = await getSession();
    const userId = session?.userId;
    if (!userId) {
      return new Response(JSON.stringify({ message: 'Not authenticated.' }), { status: 401 });
    }

    const { rows: gameRows } = await db.query(
      'SELECT * FROM Games WHERE id = $1 LIMIT 1',
      [gameId]
    );
    if (gameRows.length === 0) {
      return new Response(JSON.stringify({ message: 'Game not found.' }), { status: 404 });
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

    await db.query('BEGIN');
    transactionStarted = true;

    // ---------------- Accept Offer ----------------
    await db.query('UPDATE Offers SET status = $1 WHERE id = $2', ['accepted', offerId]);

    await db.query(
      'UPDATE Offers SET status = $1 WHERE game_id = $2 AND id != $3 AND status = $4',
      ['rejected', gameId, offerId, 'pending']
    );

    await db.query(
      'UPDATE match_players SET gold = gold + $1 WHERE user_id = $2 AND match_id = $3',
      [offer_amount, from_player_id, game.match_id]
    );

    await db.query(
      `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
       VALUES ($1, $2, $3, $4, 'offer_gain')`,
      [gameId, from_player_id, winningTeam, offer_amount]
    );

    // ---------------- Finish Current Game ----------------
    await db.query('UPDATE Games SET status = $1 WHERE id = $2', ['finished', gameId]);

    // ---------------- Create New Game ----------------
    const newTeamA = [...teamA];
    const newTeam1 = [...team1];

    if (teamA.includes(target_player_id)) {
      newTeamA.splice(newTeamA.indexOf(target_player_id), 1);
      newTeam1.push(target_player_id);
    } else {
      newTeam1.splice(newTeam1.indexOf(target_player_id), 1);
      newTeamA.push(target_player_id);
    }

    const { rows: newGameRows } = await db.query(
      `INSERT INTO Games (match_id, team_a_members, team_1_members, status)
       VALUES ($1, $2, $3, 'in progress')
       RETURNING *`,
      [game.match_id, newTeamA, newTeam1]
    );

    await db.query('COMMIT');
    transactionStarted = false;

    // ================= REALTIME EVENT =================
    const matchId = game.match_id;
    const channel = ablyServer.channels.get(`match-${matchId}-offers`);

    await channel.publish('offer-accepted', {
      gameId,
      offerId,
    });

    // ================= RESPONSE =================
    return new Response(
      JSON.stringify({
        acceptedOffer: offer,
        newGame: newGameRows[0],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    if (transactionStarted) await db.query('ROLLBACK');
    console.error('Error accepting offer:', err);
    return new Response(JSON.stringify({ message: 'Server error.' }), { status: 500 });
  }
}
