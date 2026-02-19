import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import ably from '@/lib/ably-server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  // ---- Auth ----------------------------------------------------------------
  const session = await getSession();
  const userId = session?.userId;

  if (!userId) {
    return Response.json({ message: 'Not authenticated.' }, { status: 401 });
  }

  // ---- Parse body ----------------------------------------------------------
  let offerId: number;
  try {
    const body = await req.json();
    offerId = Number(body.offerId);
    if (isNaN(offerId)) throw new Error();
  } catch {
    return Response.json({ message: 'Invalid request body.' }, { status: 400 });
  }

  // ---- Extract game ID from route params -----------------------------------
  const gameId = Number(params.id);
  if (isNaN(gameId)) {
    return Response.json({ message: 'Invalid game ID.' }, { status: 400 });
  }

  // ---- Acquire a single pooled connection for the transaction --------------
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // ---- Lock game row for the duration of the transaction -----------------
    // FOR UPDATE prevents concurrent transactions from reading the same game
    // row simultaneously and both proceeding past the status check.
    const { rows: gameRows } = await client.query<{
      id: number;
      match_id: number;
      team_a_members: number[];
      team_1_members: number[];
      winning_team: 'team_a' | 'team_1' | null;
      status: string;
    }>(
      'SELECT id, match_id, team_a_members, team_1_members, winning_team, status FROM games WHERE id = $1 FOR UPDATE',
      [gameId]
    );

    if (gameRows.length === 0) {
      await client.query('ROLLBACK');
      return Response.json({ message: 'Game not found.' }, { status: 404 });
    }

    const game = gameRows[0];

    // ---- Validate game state -----------------------------------------------
    if (game.status !== 'auction pending') {
      await client.query('ROLLBACK');
      return Response.json({ message: 'Game is not in auction phase.' }, { status: 400 });
    }

    if (!game.winning_team) {
      await client.query('ROLLBACK');
      return Response.json({ message: 'Game has no winner selected yet.' }, { status: 400 });
    }

    // ---- Authorise: user must be on the losing team ------------------------
    const { team_a_members: teamA, team_1_members: team1, winning_team: winningTeam } = game;
    const losingTeam = winningTeam === 'team_a' ? team1 : teamA;

    if (!losingTeam.includes(userId)) {
      await client.query('ROLLBACK');
      return Response.json({ message: 'Only losing team members can accept offers.' }, { status: 403 });
    }

    // ---- Atomically claim the offer ----------------------------------------
    // UPDATE ... WHERE status = 'pending' RETURNING is a single atomic operation.
    // If two requests race here, only one will get rows back — the other gets
    // zero rows and is rejected cleanly, even at READ COMMITTED isolation.
    const { rows: offerRows } = await client.query<{
      id: number;
      from_player_id: number;
      target_player_id: number;
      offer_amount: number;
    }>(
      `UPDATE offers
       SET status = 'accepted'
       WHERE id = $1 AND game_id = $2 AND status = 'pending'
       RETURNING id, from_player_id, target_player_id, offer_amount`,
      [offerId, gameId]
    );

    if (offerRows.length === 0) {
      await client.query('ROLLBACK');
      return Response.json({ message: 'Offer already accepted or not found.' }, { status: 409 });
    }

    const { from_player_id, target_player_id, offer_amount } = offerRows[0];

    // ---- Validate the target player is actually in the game ----------------
    const inTeamA = teamA.includes(target_player_id);
    const inTeam1 = team1.includes(target_player_id);

    if (!inTeamA && !inTeam1) {
      await client.query('ROLLBACK');
      return Response.json({ message: 'Target player not found in current game.' }, { status: 400 });
    }

    await client.query(
      'UPDATE offers SET status = $1 WHERE game_id = $2 AND id != $3 AND status = $4',
      ['rejected', gameId, offerId, 'pending']
    );

    // ---- Award gold to the player whose offer was accepted -----------------
    await client.query(
      'UPDATE match_players SET gold = gold + $1 WHERE user_id = $2 AND match_id = $3',
      [offer_amount, from_player_id, game.match_id]
    );

    await client.query(
      `INSERT INTO game_player_stats (game_id, player_id, team_id, gold_change, reason)
       VALUES ($1, $2, $3, $4, 'offer_gain')`,
      [gameId, from_player_id, winningTeam, offer_amount]
    );

    // ---- Mark current game as finished -------------------------------------
    await client.query(
      'UPDATE games SET status = $1 WHERE id = $2',
      ['finished', gameId]
    );

    // ---- Build new teams with player swapped -------------------------------
    const newTeamA = [...teamA];
    const newTeam1 = [...team1];

    if (inTeamA) {
      newTeamA.splice(newTeamA.indexOf(target_player_id), 1);
      newTeam1.push(target_player_id);
    } else {
      newTeam1.splice(newTeam1.indexOf(target_player_id), 1);
      newTeamA.push(target_player_id);
    }

    // ---- Guard against empty teams -----------------------------------------
    if (newTeamA.length === 0 || newTeam1.length === 0) {
      await client.query('ROLLBACK');
      return Response.json({ message: 'Trade would result in an empty team.' }, { status: 400 });
    }

    // ---- Create the next game ----------------------------------------------
    const { rows: newGameRows } = await client.query(
      `INSERT INTO games (match_id, team_a_members, team_1_members, status)
       VALUES ($1, $2, $3, 'in progress')
       RETURNING *`,
      [game.match_id, newTeamA, newTeam1]
    );

    await client.query('COMMIT');

    // ---- Notify clients (outside transaction) ------------------------------
    await ably.channels
      .get(`match-${game.match_id}-offers`)
      .publish('offer-accepted', {
        acceptedOfferId: offerId,
        // Include the revealed amount so clients can update offer state
        // directly without needing to refetch /api/game/offers
        acceptedAmount: offer_amount,
        newGame: newGameRows[0],
      });

    return Response.json({ message: 'Offer accepted and new game started.' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ACCEPT_OFFER_ERROR]', err);
    return Response.json({ message: 'Server error.' }, { status: 500 });

  } finally {
    client.release();
  }
}
