import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/app/session';
import ably from '@/lib/ably-server';

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

  const lowUpper  = minOffer + span * 0.26   // ≈ 700 in game 1
  const medLower  = minOffer + span * 0.14   // ≈ 500 in game 1
  const medUpper  = minOffer + span * 0.54   // ≈ 1200 in game 1
  const highLower = minOffer + span * 0.37   // ≈ 900 in game 1

  const eligible: TierLabel[] = []
  if (amount <= lowUpper)                          eligible.push('Low')
  if (amount >= medLower && amount <= medUpper)    eligible.push('Medium')
  if (amount >= highLower)                         eligible.push('High')

  // Fallback — should never be needed given valid offer amounts, but
  // guard against floating-point edge cases at the exact boundaries.
  if (eligible.length === 0) {
    const mid = (minOffer + maxOffer) / 2
    return amount < mid ? 'Low' : 'High'
  }

  return eligible[Math.floor(Math.random() * eligible.length)]
}

/* ----------------------------------------------------------------------- */

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  const body = await req.json();
  const { target_player_id, offer_amount } = body;

  const gameId = Number(params.id);
  if (isNaN(gameId)) {
    return new Response(JSON.stringify({ message: 'Invalid game ID.' }), { status: 400 });
  }
  const session = await getSession();
  const userId = session?.userId;

  if (!userId) {
    return new Response(JSON.stringify({ message: 'Not authenticated.' }), { status: 401 });
  }

  try {
    const { rows: gameRows } = await db.query(
      'SELECT * FROM Games WHERE id = $1 LIMIT 1',
      [gameId]
    );

    if (gameRows.length === 0) {
      return new Response(JSON.stringify({ message: 'Game not found.' }), { status: 404 });
    }

    const game = gameRows[0];
    const winningTeam = game.winning_team;
    const teamA = game.team_a_members;
    const team1 = game.team_1_members;
    const winningTeamMembers = winningTeam === 'team_a' ? teamA : team1;

    if (!winningTeamMembers.includes(userId)) {
      return new Response(
        JSON.stringify({ message: 'Only winning team members can make offers.' }),
        { status: 403 }
      );
    }

    const matchResult = await db.query(
      'SELECT match_id FROM Games WHERE id = $1',
      [gameId]
    );
    const matchId = matchResult.rows[0]?.match_id;

    const { rows: matchGames } = await db.query(
      'SELECT COUNT(*) FROM Games WHERE match_id = $1',
      [matchId]
    );

    const gamesPlayed = parseInt(matchGames[0].count, 10);

    const maxOfferAmount = 2000 + gamesPlayed * 500;
    const minOfferAmount = 250 + gamesPlayed * 200;

    if (offer_amount < minOfferAmount || offer_amount > maxOfferAmount) {
      return new Response(
        JSON.stringify({
          message: `Offer amount must be between ${minOfferAmount} and ${maxOfferAmount}.`,
        }),
        { status: 400 }
      );
    }

    const existing = await db.query(
      'SELECT * FROM Offers WHERE from_player_id = $1 AND game_id = $2',
      [userId, gameId]
    );

    if (existing.rows.length > 0) {
      return new Response(
        JSON.stringify({ message: 'You have already submitted an offer.' }),
        { status: 400 }
      );
    }

    // ---- Assign a randomised tier label ----------------------------------
    // Picks from all eligible tiers for this amount so that overlap-zone
    // offers are genuinely ambiguous — the losing team cannot reconstruct
    // the order from labels alone.
    const tierLabel = pickTierLabel(offer_amount, minOfferAmount, maxOfferAmount)

    const { rows: inserted } = await db.query(
      `INSERT INTO Offers (game_id, from_player_id, target_player_id, offer_amount, status, tier_label)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [gameId, userId, target_player_id, offer_amount, 'pending', tierLabel]
    );

    const savedOffer = inserted[0];

    // Never expose offer_amount while the offer is pending — strip it from
    // both the Ably event and the API response so it can't be read via
    // network inspection by other winning team members.
    const { offer_amount: _hidden, ...safeOffer } = savedOffer;

    if (matchId) {
      await ably.channels
        .get(`match-${matchId}-offers`)
        .publish('new-offer', safeOffer);
    }

    return new Response(
      JSON.stringify({ message: 'Offer submitted.', offer: safeOffer }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error submitting offer:', err);
    return new Response(JSON.stringify({ message: 'Server error.' }), { status: 500 });
  }
}
