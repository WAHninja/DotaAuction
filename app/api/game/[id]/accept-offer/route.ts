import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import { broadcastEvent } from '@/lib/supabase-server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  // ---- Auth ----------------------------------------------------------------
  const session = await getSession();
  const userId  = session?.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  // ---- Parse + validate body -----------------------------------------------
  // Number() is too permissive — Number("1.5") passes isNaN but is not a
  // valid integer ID. We require a positive integer throughout.
  let offerId: number;
  try {
    const body = await req.json();
    offerId = Number(body.offerId);
    if (!Number.isInteger(offerId) || offerId <= 0) throw new Error();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // ---- Validate route param ------------------------------------------------
  const { id } = await params;
  const gameId  = Number(id);
  if (!Number.isInteger(gameId) || gameId <= 0) {
    return NextResponse.json({ error: 'Invalid game ID.' }, { status: 400 });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // ---- Lock game row ------------------------------------------------------
    // FOR UPDATE prevents concurrent accept-offer requests from reading the
    // same game state simultaneously and both proceeding past the status check.
    const { rows: gameRows } = await client.query<{
      id: number;
      match_id: number;
      team_a_members: number[];
      team_1_members: number[];
      winning_team: 'team_a' | 'team_1' | null;
      status: string;
    }>(
      `SELECT id, match_id, team_a_members, team_1_members, winning_team, status
       FROM games
       WHERE id = $1
       FOR UPDATE`,
      [gameId]
    );

    if (gameRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
    }

    const game = gameRows[0];

    // ---- Validate game state ------------------------------------------------
    if (game.status !== 'auction pending') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Game is not in auction phase.' }, { status: 400 });
    }

    // Note: the winning_team null-check that previously appeared here has been
    // removed. The select-winner route sets status and winning_team atomically
    // in a single UPDATE, so winning_team is guaranteed non-null whenever
    // status = 'auction pending'. The check was unreachable dead code.

    // ---- Authorise: caller must be on the losing team ----------------------
    const {
      team_a_members: teamA,
      team_1_members: team1,
      winning_team:   winningTeam,
    } = game;

    const losingTeam = winningTeam === 'team_a' ? team1 : teamA;

    if (!losingTeam.includes(userId)) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Only losing team members can accept offers.' },
        { status: 403 }
      );
    }

    // ---- Atomically claim the offer ----------------------------------------
    // UPDATE ... WHERE status = 'pending' RETURNING is a single atomic
    // operation. If two requests race, only one gets rows back — the other
    // gets zero rows and a 409 with no side effects, even at READ COMMITTED.
    const { rows: offerRows } = await client.query<{
      id: number;
      from_player_id: number;
      target_player_id: number;
      offer_amount: number;
    }>(
      `UPDATE offers
       SET status = 'accepted'
       WHERE id = $1
         AND game_id = $2
         AND status = 'pending'
       RETURNING id, from_player_id, target_player_id, offer_amount`,
      [offerId, gameId]
    );

    if (offerRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Offer already accepted or not found.' },
        { status: 409 }
      );
    }

    const { from_player_id, target_player_id, offer_amount } = offerRows[0];

    // ---- Validate target player + build new teams before any further writes --
    const inTeamA = teamA.includes(target_player_id);
    const inTeam1 = team1.includes(target_player_id);

    if (!inTeamA && !inTeam1) {
      // Defensive only — submit-offer already validates the target is a
      // winning team member, so this path should never be reached with
      // consistent data.
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Target player not found in current game.' },
        { status: 400 }
      );
    }

    // Build the new team composition before writing anything
    const newTeamA = [...teamA];
    const newTeam1 = [...team1];

    if (inTeamA) {
      newTeamA.splice(newTeamA.indexOf(target_player_id), 1);
      newTeam1.push(target_player_id);
    } else {
      newTeam1.splice(newTeam1.indexOf(target_player_id), 1);
      newTeamA.push(target_player_id);
    }

    // Guard before any further writes — ROLLBACK here only undoes the offer
    // claim above. Previously this check ran after 5 downstream writes.
    if (newTeamA.length === 0 || newTeam1.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Trade would result in an empty team.' },
        { status: 400 }
      );
    }

    // ---- Reject all other pending offers for this game ----------------------
    await client.query(
      `UPDATE offers
       SET status = 'rejected'
       WHERE game_id = $1
         AND id      != $2
         AND status  = 'pending'`,
      [gameId, offerId]
    );

    // ---- Award gold to the seller ------------------------------------------
    await client.query(
      `UPDATE match_players
       SET gold = gold + $1
       WHERE user_id  = $2
         AND match_id = $3`,
      [offer_amount, from_player_id, game.match_id]
    );

    await client.query(
      `INSERT INTO game_player_stats
         (game_id, player_id, team_id, gold_change, reason)
       VALUES ($1, $2, $3, $4, 'offer_gain')`,
      [gameId, from_player_id, winningTeam, offer_amount]
    );

    // ---- Mark current game as finished -------------------------------------
    await client.query(
      `UPDATE games SET status = 'finished' WHERE id = $1`,
      [gameId]
    );

    // ---- Create the next game ----------------------------------------------
    await client.query(
      `INSERT INTO games (match_id, team_a_members, team_1_members, status)
       VALUES ($1, $2, $3, 'in progress')`,
      [game.match_id, newTeamA, newTeam1]
    );

    await client.query('COMMIT');

    // ---- Notify clients (outside transaction) ------------------------------
    // newGame is intentionally excluded from this payload. The match page
    // calls fetchMatchData() on offer-accepted, which re-fetches the full
    // match state including the new game. Sending newGame here was dead weight
    // — the client never read it from the broadcast payload.
    await broadcastEvent(
      `match-${game.match_id}-offers`,
      'offer-accepted',
      {
        acceptedOfferId: offerId,
        acceptedAmount:  offer_amount,
      }
    );

    return NextResponse.json({ ok: true });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ACCEPT_OFFER_ERROR]', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });

  } finally {
    client.release();
  }
}
