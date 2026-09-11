/**
 * The permitted offer range for a game, as a function of its position within
 * its match.
 *
 * Shared deliberately. These constants define what an offer amount *means*:
 * submit-offer uses them to validate and to assign a tier, and the stats route
 * uses them to normalise historical offers back into a comparable 0–1 position.
 * If the two ever disagreed, every market-value figure in the app would be
 * quietly wrong in a way nothing would surface — no error, no failed build,
 * just numbers that are a bit off.
 *
 * gameIndex is the number of games in the match already finished when the offer
 * was made: 0 during game 1, 1 during game 2, and so on. The range both shifts
 * up and widens as a match runs long, which is exactly why a raw offer amount
 * cannot be compared across matches of different lengths.
 */

export const OFFER_MIN_BASE = 450;
export const OFFER_MIN_STEP = 200;
export const OFFER_MAX_BASE = 2500;
export const OFFER_MAX_STEP = 500;

export type OfferRange = { min: number; max: number };

/** Game 1 → 450–2500, game 2 → 650–3000, game N → 450+(N-1)*200 … */
export function offerRangeForGameIndex(gameIndex: number): OfferRange {
  return {
    min: OFFER_MIN_BASE + gameIndex * OFFER_MIN_STEP,
    max: OFFER_MAX_BASE + gameIndex * OFFER_MAX_STEP,
  };
}

/**
 * Where an offer sits within its game's permitted range, as 0–1.
 *
 * This is the length-independent measure of how strong an offer was. A raw
 * amount cannot be compared between matches because the range moves; a position
 * within the range can, because it is a proportion of whatever was allowed at
 * the time.
 *
 * Clamped because historical rows may predate a change to the formula, and a
 * strength of 1.4 would silently skew an average rather than being obviously
 * wrong.
 */
export function offerStrength(amount: number, gameIndex: number): number {
  const { min, max } = offerRangeForGameIndex(gameIndex);
  const span = max - min;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (amount - min) / span));
}
