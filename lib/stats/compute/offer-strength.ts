/**
 * Offer strength aggregation — pure functions over rows fetched by the stats
 * route.
 *
 * Separated from the route handler for the same reason lib/stats/select.ts is
 * separated from the components: the route is already 680 lines, and each
 * derived stat added inline makes the next one harder to reason about. These
 * take plain rows and return plain numbers, so they can be exercised without a
 * database.
 *
 * What this replaces, and why:
 *
 *   netGold was SUM(gold_change) over every row ever recorded. It measured how
 *   much someone had played, and gold has no meaning across match boundaries —
 *   it resets each match and one win condition is a within-match threshold.
 *
 *   averageOfferValue had the same flaw less obviously. The permitted offer
 *   range shifts and widens with each game in a match, so an average raw amount
 *   mostly reflects how many long matches a player has been in.
 *
 * Offer strength fixes both by expressing every offer as its position within
 * the range that was permitted at the time — a proportion, not an accumulation.
 */

import { offerStrength } from '@/lib/offer-range';

export type GameRow = {
  id: number;
  match_id: number;
};

export type OfferRow = {
  game_id: number;
  from_player_id: number;
  target_player_id: number;
  offer_amount: number;
};

/**
 * Maps each finished game to its index within its own match.
 *
 * The index reconstructs submit-offer's `completedGames`: that counted games in
 * the match already finished when the offer was made, and since games finish in
 * creation order, a game's position among its match's finished games ordered by
 * id is exactly that count.
 *
 * Only finished games are passed in, so a game from an abandoned match is
 * absent and its offers are skipped rather than being normalised against a
 * fabricated range.
 */
export function buildGameIndex(games: GameRow[]): Map<number, number> {
  const byMatch = new Map<number, GameRow[]>();
  for (const g of games) {
    const list = byMatch.get(g.match_id);
    if (list) list.push(g);
    else byMatch.set(g.match_id, [g]);
  }

  const index = new Map<number, number>();
  for (const list of byMatch.values()) {
    list.sort((a, b) => a.id - b.id);
    list.forEach((g, i) => index.set(g.id, i));
  }
  return index;
}

export type PlayerOfferStrength = {
  /** Mean strength of offers this player was the target of — market value.
   *  null when they have never been offered. */
  received: number | null;
  receivedCount: number;
  /** Mean strength of offers this player sent — their asking price when
   *  selling a teammate, not a bid to acquire anyone. null when they have
   *  never sent one. */
  made: number | null;
  madeCount: number;
};

/**
 * Mean offer strength per player, both as the player being sold and as the
 * teammate setting their price.
 *
 * Returned as a map keyed by player id so the caller can merge it into whatever
 * per-player structure it already has.
 *
 * Every offer counts, not only accepted ones. A rejected offer is still a
 * statement about what someone was considered to be worth, and filtering to
 * accepted offers would bias market value towards prices the other team was
 * willing to meet.
 */
export function computeOfferStrength(
  offers: OfferRow[],
  gameIndex: Map<number, number>,
): Map<number, PlayerOfferStrength> {
  const acc = new Map<number, { recv: number; recvN: number; made: number; madeN: number }>();

  const bucket = (id: number) => {
    let b = acc.get(id);
    if (!b) { b = { recv: 0, recvN: 0, made: 0, madeN: 0 }; acc.set(id, b); }
    return b;
  };

  for (const o of offers) {
    const idx = gameIndex.get(o.game_id);
    if (idx === undefined) continue;

    const strength = offerStrength(o.offer_amount, idx);

    const target = bucket(o.target_player_id);
    target.recv += strength;
    target.recvN += 1;

    // from_player_id is the seller: submit-offer validates the target as "a
    // winning teammate, not the caller", so an offer is always someone pricing
    // a team-mate for the losing side to buy.
    const seller = bucket(o.from_player_id);
    seller.made += strength;
    seller.madeN += 1;
  }

  const out = new Map<number, PlayerOfferStrength>();
  for (const [id, b] of acc) {
    out.set(id, {
      received:      b.recvN > 0 ? +(b.recv / b.recvN).toFixed(4) : null,
      receivedCount: b.recvN,
      made:          b.madeN > 0 ? +(b.made / b.madeN).toFixed(4) : null,
      madeCount:     b.madeN,
    });
  }
  return out;
}
