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
