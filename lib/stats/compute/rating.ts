/**
 * Player ratings — Elo adapted for teams of unequal size.
 *
 * Rating, team size, and gold asymmetry.
 *
 * The gold term is optional and weighted by `goldWeight`, so it can be turned
 * off entirely by passing 0 — which is how rating-eval measures whether it
 * earns its place rather than assuming it does.
 *
 * ── Why not a team average ──────────────────────────────────────────────────
 *
 * The obvious approach — average each side's ratings and run standard Elo —
 * throws away the single biggest factor in this format. One player against five
 * is not "one rating versus the mean of five"; the numbers matter regardless of
 * quality, and in a league where trades routinely produce 1-v-4 games, ignoring
 * that makes every rating wrong.
 *
 * Instead each player contributes a strength, and a team's strength is the sum:
 *
 *     strength(player) = exp(rating / SCALE)
 *     P(A beats B)     = strengthA / (strengthA + strengthB)
 *
 * This is Bradley-Terry with additive team strength. Summing handles size for
 * free: five equal players have five times the strength of one, so the solo
 * player is expected to win 1/6 of the time with no hand-tuned handicap term.
 *
 * It is also roughly calibrated against this league's real data. Solo players
 * face 3.4 opponents on average and convert about 17% of those games; the model
 * predicts 1/(1+3.4) ≈ 23% for equally rated players. Close enough to trust as
 * a starting point, and the gap is in the right direction — the players who end
 * up alone tend to be the ones the others rate highly enough to isolate.
 *
 * ── Zero-sum updates ────────────────────────────────────────────────────────
 *
 * The update is computed per team and then split among its members, rather than
 * applied per player. Applying it per player would mean a solo win took 0.77K
 * from each of five opponents while granting the winner 0.77K — inflating the
 * pool by 3K every upset. Splitting keeps the ledger balanced and says
 * something true: when five lose to one, no individual among the five is as
 * responsible as the one who beat them.
 */

import { goldShare } from '@/lib/stats/compute/gold-timeline';

export const STARTING_RATING = 1500;

/**
 * Rating points for a 10:1 odds gap.
 *
 * 400 / ln(10) because strength uses exp() rather than 10^(). This reproduces
 * the familiar Elo scale where 400 points means a ten-to-one favourite.
 */
const SCALE = 400 / Math.LN10;

/** Provisional K, and the number of games it applies for. */
const K_PROVISIONAL = 40;
const PROVISIONAL_GAMES = 20;
const K_ESTABLISHED = 20;

/**
 * Replay passes over the full history.
 *
 * Ratings are circular — yours depends on your opponents', theirs on yours — so
 * a single chronological pass rates early games against uninformed estimates.
 * Re-running with the previous pass's final ratings as the starting point
 * converges quickly.
 *
 * The cost is that intermediate ratings stop being a true history: after pass
 * two, game one was rated as though everyone already had their final strength.
 * That is fine while only the current rating is displayed. If a rating-over-time
 * chart is ever added, it must come from a single pass.
 */
const PASSES = 3;

export type RatingGameRow = {
  id: number;
  team_1_members: number[];
  team_a_members: number[];
  winning_team: 'team_1' | 'team_a' | null;
};

export type RatingOptions = {
  /**
   * How much a gold advantage shifts the expected result, in log-odds at
   * total dominance.
   *
   * A side holding every coin has a gold-share difference of 1, so a weight of
   * 2 makes them roughly an 88% favourite between equally rated, equally sized
   * teams. 0 disables the term.
   *
   * Being ahead on gold is largely earned by winning earlier games in the same
   * match, and those wins were already rewarded when they happened. Discounting
   * a win that arrives with a gold lead stops one hot streak inside a single
   * match being paid for twice.
   */
  goldWeight?: number;
  /** gameId -> playerId -> gold entering that game. Omit to ignore gold. */
  goldTimeline?: Map<number, Map<number, number>>;
  /** Replay passes. Evaluation uses 1 so every prediction is made blind. */
  passes?: number;
};

/** One game's prediction, kept so accuracy can be scored after the fact. */
export type RatingPrediction = {
  gameId: number;
  /** Modelled probability that team_1 won. */
  expected: number;
  /** What actually happened, 1 or 0. */
  actual: number;
};

export type PlayerRating = {
  rating: number;
  /** Games contributing to it — the denominator for how much to trust it. */
  games: number;
};

/**
 * Probability the first side beats the second.
 *
 * `goldAdvantage` is side A's share of the gold in play minus side B's, so it
 * runs from -1 to 1 and is 0 when the sides are level or no gold exists. It
 * enters as a log-odds shift, which composes cleanly with the Bradley-Terry
 * term: ln(strengthA / strengthB) is already a log-odds.
 */
export function winProbability(
  sideA: number[],
  sideB: number[],
  goldAdvantage = 0,
  goldWeight = 0,
): number {
  const strength = (ratings: number[]) =>
    ratings.reduce((sum, r) => sum + Math.exp(r / SCALE), 0);

  const a = strength(sideA);
  const b = strength(sideB);
  if (a === 0 || b === 0) return 0.5;

  const logit = Math.log(a / b) + goldWeight * goldAdvantage;
  return 1 / (1 + Math.exp(-logit));
}

/**
 * Rate every player by replaying finished games in order.
 *
 * Games are sorted by id here rather than trusting the caller's ordering: for a
 * rating system the sequence *is* the computation, and it should not depend on
 * an ORDER BY clause surviving a future edit.
 *
 * Games with no recorded winner are skipped — there is no result to learn from,
 * and treating one as a draw would drag both sides toward each other for no
 * reason.
 */
export function computeRatings(
  games: RatingGameRow[],
  opts: RatingOptions = {},
): Map<number, PlayerRating> {
  return replay(games, opts).ratings;
}

/**
 * The replay itself, returning predictions alongside ratings.
 *
 * Split out so rating-eval can score the model without duplicating the loop —
 * an evaluation that ran against a reimplementation of the thing it evaluates
 * would be measuring the wrong code.
 */
export function replay(
  games: RatingGameRow[],
  opts: RatingOptions = {},
): { ratings: Map<number, PlayerRating>; predictions: RatingPrediction[] } {
  const goldWeight = opts.goldWeight ?? 0;
  const timeline   = opts.goldTimeline;
  const passes     = opts.passes ?? PASSES;
  const ordered = [...games]
    .sort((a, b) => a.id - b.id)
    .filter(g => g.winning_team !== null);

  let ratings = new Map<number, number>();
  let predictions: RatingPrediction[] = [];

  for (let pass = 0; pass < passes; pass++) {
    // Carry the previous pass's ratings forward as priors; games counts restart
    // so the provisional K applies to a player's first games each time.
    const working = new Map(ratings);
    const played = new Map<number, number>();
    predictions = [];

    for (const game of ordered) {
      const team1 = game.team_1_members ?? [];
      const teamA = game.team_a_members ?? [];
      if (team1.length === 0 || teamA.length === 0) continue;

      const ratingOf = (id: number) => working.get(id) ?? STARTING_RATING;
      const r1 = team1.map(ratingOf);
      const rA = teamA.map(ratingOf);

      // Gold advantage is measured before the game, from the timeline, so it
      // reflects the position the teams went in with rather than the one the
      // result produced.
      const share1 = timeline ? goldShare(team1, teamA, timeline.get(game.id)) : 0.5;
      const advantage = share1 * 2 - 1;

      const p1 = winProbability(r1, rA, advantage, goldWeight);
      const team1Won = game.winning_team === 'team_1';

      predictions.push({ gameId: game.id, expected: p1, actual: team1Won ? 1 : 0 });

      // One delta per team, then shared out. See the note on zero-sum above.
      const delta1 = (team1Won ? 1 : 0) - p1;
      const deltaA = -delta1;

      for (const [members, teamDelta] of [
        [team1, delta1] as const,
        [teamA, deltaA] as const,
      ]) {
        const share = teamDelta / members.length;
        for (const id of members) {
          const n = played.get(id) ?? 0;
          const k = n < PROVISIONAL_GAMES ? K_PROVISIONAL : K_ESTABLISHED;
          working.set(id, ratingOf(id) + k * share);
          played.set(id, n + 1);
        }
      }
    }

    ratings = working;

    // Last pass also records the games counts.
    if (pass === passes - 1) {
      const out = new Map<number, PlayerRating>();
      for (const [id, rating] of ratings) {
        out.set(id, { rating: Math.round(rating), games: played.get(id) ?? 0 });
      }
      return { ratings: out, predictions };
    }
  }

  return { ratings: new Map(), predictions: [] };
}
