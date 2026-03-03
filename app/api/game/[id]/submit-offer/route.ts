import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import { broadcastEvent } from '@/lib/supabase-server';

/* -----------------------------------------------------------------------
   Tier calculation
   -----------------------------------------------------------------------
   Tiers are defined as proportions of the current offer span so the
   ambiguity zones remain consistent regardless of which game you're in.

   Proportions (verified against the stated game 1 values of 250–2000):
     Low    → bottom 26% of span  (≈ 250–700 in game 1)
     Medium → 14%–54% of span     (≈ 500–1200 in game 1)
     High   → 37%–top of span     (≈ 900–2000 in game 1)

   Overlap zones:
     Low/Medium  → 14%–26%  (≈ 500–700 in game 1)
     Medium/High → 37%–54%  (≈ 900–1200 in game 1)

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
  if (amount <= lowUpper)                          eligible.push('Low')
  if (amount >= medLower && amount <= medUpper)    eligible.push('Medium')
  if (amount >= highLower)                         eligible.push('High')

  if (eligible.length === 0) {
    const mid = (minOffer + maxOffer) / 2
    return amount < mid ? 'Low' : 'High'
  }

  return eligible[Math.floor(Math.random() * eligible.length)]
}

/* ----------------------------------------------------------------------- */

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  // ---- Auth ----------------------------------------------------------------
  const session = await getSession();
  const userId = session?.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  // ---- Parse inputs --------------------------------------------------------
  const { id } = await params;
  const gameId = Number(id);
  if (isNaN(gameId)) {
    return NextResponse.json({ error: 'Invalid game ID.' }, { status: 400 });
  }

  let target_player_id: number, offer_amount: number;
  try {
    const body = await req.json();
    target_player_id = Number(body.target_player_id);
    offer_amount = Number(body.offer_amount);
    if (isNaN(target_player_id) || isNaN(offer_amount)) throw new Error();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // ---- Acquire a pooled connection for the transaction --------------------
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // ---- Lock the game row --------------------------------------------------
    // FOR UPDATE prevents a second concurrent request from reading the same
    // game state and both proceeding past the validation checks.
    const { rows: gameRows } = await client.query<{
      id: number;
      match_id: number;
      status: string;
      winning_team: 'team_a' | 'team_1' | null;
      team_a_members: number[];
      team_1_members: number[];
    }>(
      `SELECT id, match_id, status, winning_team, team_a_members, team_1_members
       FROM games WHERE id = $1 FOR UPDATE`,
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

    if (!game.winning_team) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Game has no winner selected yet.' }, { status: 400 });
    }

    const teamA = game.team_a_members;
    const team1 = game.team_1_members;
    const winningTeam = game.winning_team;
    const winningTeamMembers = winningTeam === 'team_a' ? teamA : team1;
    const losingTeamMembers  = winningTeam === 'team_a' ? team1 : teamA;

    // ---- Validate caller is on the winning team -----------------------------
    if (!winningTeamMembers.includes(userId)) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Only winning team members can make offers.' }, { status: 403 });
    }

    // ---- Validate target is a winning teammate (not themselves) -------------
    // The target must be another member of the winning team — the offer is
    // the caller selling a teammate to the losing team.
    if (target_player_id === userId) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'You cannot offer yourself.' }, { status: 400 });
    }

    if (!winningTeamMembers.includes(target_player_id)) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Target player is not on your team.' }, { status: 400 });
    }

    // ---- Validate offer amount ----------------------------------------------
    const { rows: countRows } = await client.query<{ count: string }>(
      'SELECT COUNT(*) FROM games WHERE match_id = $1',
      [game.match_id]
    );
    const gamesPlayed = parseInt(countRows[0].count, 10);

    const minOfferAmount = 250 + gamesPlayed * 200;
    const maxOfferAmount = 2000 + gamesPlayed * 500;

    if (offer_amount < minOfferAmount || offer_amount > maxOfferAmount) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: `Offer amount must be between ${minOfferAmount} and ${maxOfferAmount}.` },
        { status: 400 }
      );
    }

    // ---- Check for duplicate offer ------------------------------------------
    // With the FOR UPDATE lock above, two concurrent requests from the same
    // user will execute this check serially — the second will find the row
    // inserted by the first and be rejected cleanly.
    const { rows: existing } = await client.query(
      'SELECT id FROM offers WHERE from_player_id = $1 AND game_id = $2',
      [userId, gameId]
    );

    if (existing.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'You have already submitted an offer.' }, { status: 409 });
    }

    // ---- Insert the offer ---------------------------------------------------
    const tierLabel = pickTierLabel(offer_amount, minOfferAmount, maxOfferAmount);

    const { rows: inserted } = await client.query(
      `INSERT INTO offers (game_id, from_player_id, target_player_id, offer_amount, status, tier_label)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING *`,
      [gameId, userId, target_player_id, offer_amount, tierLabel]
    );

    await client.query('COMMIT');

    const savedOffer = inserted[0];

    // Never expose offer_amount while the offer is pending — strip it from
    // both the broadcast and the API response.
    const { offer_amount: _hidden, ...safeOffer } = savedOffer;

    await broadcastEvent(
      `match-${game.match_id}-offers`,
      'new-offer',
      safeOffer
    );

    return NextResponse.json({ message: 'Offer submitted.', offer: safeOffer });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error submitting offer:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });

  } finally {
    client.release();
  }
}
