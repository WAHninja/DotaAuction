import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import { broadcastEvent } from '@/lib/supabase-server';

/* -----------------------------------------------------------------------
   Tier calculation
   -----------------------------------------------------------------------
   Tiers are defined as proportions of the current offer span so the
   ambiguity zones remain consistent regardless of which game you're in.

   Proportions (verified against the stated game 1 values of 450–2500):
     Low    → bottom 26% of span  (≈ 450–983 in game 1)
     Medium → 14%–54% of span     (≈ 737–1558 in game 1)
     High   → 37%–top of span     (≈ 1209–2500 in game 1)

   Overlap zones:
     Low/Medium  → 14%–26%  (≈ 737–983 in game 1)
     Medium/High → 37%–54%  (≈ 1209–1558 in game 1)

   When an amount falls in an overlap zone, we pick one of the eligible
   tiers at random and store it. This means two offers at similar amounts
   can legitimately show different labels, removing the ability to rank
   offers by label alone.
----------------------------------------------------------------------- */

type TierLabel = 'Low' | 'Medium' | 'High'

function pickTierLabel(amount: number, minOffer: number, maxOffer: number): TierLabel {
  const span = maxOffer - minOffer

  const lowUpper  = minOffer + span * 0.26
  const medLower  = minOffer + span * 0.14
  const medUpper  = minOffer + span * 0.54
  const highLower = minOffer + span * 0.37

  const eligible: TierLabel[] = []
  if (amount <= lowUpper)                        eligible.push('Low')
  if (amount >= medLower && amount <= medUpper)  eligible.push('Medium')
  if (amount >= highLower)                       eligible.push('High')

  if (eligible.length === 0) {
    const mid = (minOffer + maxOffer) / 2
    return amount < mid ? 'Low' : 'High'
  }

  return eligible[Math.floor(Math.random() * eligible.length)]
}

/* ----------------------------------------------------------------------- */

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

  // ---- Validate route param ------------------------------------------------
  const { id } = await params;
  const gameId  = Number(id);
  if (!Number.isInteger(gameId) || gameId <= 0) {
    return NextResponse.json({ error: 'Invalid game ID.' }, { status: 400 });
  }

  // ---- Parse + validate body -----------------------------------------------
  // All three values must be positive integers.
  //   gameId / target_player_id — database IDs are never fractional
  //   offer_amount              — gold is always whole numbers in this codebase
  // Number("1.5") passes isNaN but must be rejected here.
  let target_player_id: number;
  let offer_amount: number;
  try {
    const body = await req.json();
    target_player_id = Number(body.target_player_id);
    offer_amount     = Number(body.offer_amount);
    if (
      !Number.isInteger(target_player_id) || target_player_id <= 0 ||
      !Number.isInteger(offer_amount)     || offer_amount     <= 0
    ) throw new Error();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // ---- Lock game row + fetch finished-game count in one query ------------
    //
    // Previously two sequential queries:
    //   1. SELECT ... FROM games WHERE id = $1 FOR UPDATE
    //   2. SELECT COUNT(*) FROM games WHERE match_id = $1   ← separate trip
    //
    // The count is inlined as a scalar subquery so we pay one round-trip
    // instead of two. The lock (FOR UPDATE) still applies to the outer row.
    //
    // `completedGames` counts only finished games — games that have already
    // had their auction resolved. This gives 0 during game 1 (min = 450),
    // 1 during game 2 (min = 650), and so on.
    // Counting all games (including the current one) would be an off-by-one:
    // game 1 would return count=1 → min=650 instead of the correct 450.
    const { rows: gameRows } = await client.query<{
      id: number;
      match_id: number;
      status: string;
      winning_team: 'team_a' | 'team_1' | null;
      team_a_members: number[];
      team_1_members: number[];
      finished_count: string;   // COUNT() returns text in node-postgres
    }>(
      `SELECT
         g.id,
         g.match_id,
         g.status,
         g.winning_team,
         g.team_a_members,
         g.team_1_members,
         (
           SELECT COUNT(*)
           FROM games
           WHERE match_id = g.match_id
             AND status   = 'finished'
         ) AS finished_count
       FROM games g
       WHERE g.id = $1
       FOR UPDATE`,
      [gameId]
    );

    if (gameRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
    }

    const game           = gameRows[0];
    // completedGames = number of games fully finished BEFORE this auction.
    // Game 1 auction → 0, game 2 auction → 1, game N auction → N-1.
    const completedGames = parseInt(game.finished_count, 10);

    // ---- Validate game state ------------------------------------------------
    if (game.status !== 'auction pending') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Game is not in auction phase.' }, { status: 400 });
    }

    // Note: the winning_team null-check that previously appeared here has been
    // removed. The select-winner route sets status and winning_team atomically
    // in a single UPDATE, so winning_team is guaranteed non-null whenever
    // status = 'auction pending'. The check was unreachable dead code.

    const teamA              = game.team_a_members;
    const team1              = game.team_1_members;
    const winningTeam        = game.winning_team!;
    const winningTeamMembers = winningTeam === 'team_a' ? teamA : team1;

    // ---- Validate caller is on the winning team -----------------------------
    if (!winningTeamMembers.includes(userId)) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Only winning team members can make offers.' },
        { status: 403 }
      );
    }

    // ---- Validate target is a winning teammate, not the caller --------------
    // The offer is the caller selling a teammate to the losing team.
    if (target_player_id === userId) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'You cannot offer yourself.' }, { status: 400 });
    }

    if (!winningTeamMembers.includes(target_player_id)) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Target player is not on your team.' },
        { status: 400 }
      );
    }

    // ---- Validate offer amount ----------------------------------------------
    // Game 1:  min = 450,  max = 2500  (completedGames = 0)
    // Game 2:  min = 650,  max = 3000  (completedGames = 1)
    // Game N:  min = 450 + (N-1)*200,  max = 2500 + (N-1)*500
    const minOfferAmount = 450 + completedGames * 200;
    const maxOfferAmount = 2500 + completedGames * 500;

    if (offer_amount < minOfferAmount || offer_amount > maxOfferAmount) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: `Offer amount must be between ${minOfferAmount} and ${maxOfferAmount}.` },
        { status: 400 }
      );
    }

    // ---- Check for duplicate offer ------------------------------------------
    // The FOR UPDATE lock above serialises concurrent requests from the same
    // user — the second will find the row inserted by the first and get a 409.
    const { rows: existing } = await client.query(
      `SELECT id FROM offers WHERE from_player_id = $1 AND game_id = $2`,
      [userId, gameId]
    );

    if (existing.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'You have already submitted an offer.' },
        { status: 409 }
      );
    }

    // ---- Insert the offer ---------------------------------------------------
    const tierLabel = pickTierLabel(offer_amount, minOfferAmount, maxOfferAmount);

    // Explicit RETURNING columns instead of RETURNING * — the result is sent
    // directly to clients via broadcast. RETURNING * would silently expose any
    // future columns added to the offers table.
    // offer_amount is intentionally excluded here: it must never be visible
    // to other players while the offer is still pending.
    const { rows: inserted } = await client.query<{
      id: number;
      game_id: number;
      from_player_id: number;
      target_player_id: number;
      status: string;
      tier_label: TierLabel;
      created_at: string;
    }>(
      `INSERT INTO offers (game_id, from_player_id, target_player_id, offer_amount, status, tier_label)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING id, game_id, from_player_id, target_player_id, status, tier_label, created_at`,
      [gameId, userId, target_player_id, offer_amount, tierLabel]
    );

    await client.query('COMMIT');

    const safeOffer = inserted[0];

    await broadcastEvent(
      `match-${game.match_id}-offers`,
      'new-offer',
      safeOffer
    );

    return NextResponse.json({ ok: true, offer: safeOffer });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[SUBMIT_OFFER_ERROR]', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });

  } finally {
    client.release();
  }
}
