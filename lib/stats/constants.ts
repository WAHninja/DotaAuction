/**
 * Shared thresholds for statistical confidence.
 *
 * Below these sample sizes a rate is noise rather than signal — a 67% win rate
 * from 3 games and a 67% win rate from 40 games are not the same claim, and
 * rendering them identically misleads. Components should hide or de-emphasise
 * rates that fall short rather than showing a confident-looking percentage.
 *
 * Extracted so every surface uses the same cutoff. Previously these lived in
 * StatsTab, which meant any new stats view would have picked its own number.
 */

/** Minimum games before a player win rate is shown. */
export const MIN_GAMES_FOR_RATE = 3;

/** Minimum picks before a hero win rate is shown. Mirrors the API, which
 *  already nulls HeroStat.winRate below this threshold. */
export const MIN_PICKS_FOR_RATE = 3;

/**
 * Minimum offers before a market value is shown.
 *
 * Offer strength is noisier than win rate: a single offer is one person's
 * opinion on one night, and averaging two of them is barely better. Set higher
 * than the game thresholds for that reason.
 */
export const MIN_OFFERS_FOR_STRENGTH = 4;

/**
 * Minimum discretionary opportunities before a selection index is shown.
 *
 * The index is a ratio against an expected value, so it is violently unstable
 * at small n: one pick from two opportunities on a three-player team reads as
 * "twice as often as chance" on the strength of a single decision.
 */
export const MIN_SELECTION_OPPORTUNITIES = 6;
