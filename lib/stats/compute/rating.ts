/**
 * Player ratings — Elo adapted for teams of unequal size.
 *
 * Step one of the ranking system: rating and team size only. Gold asymmetry
 * comes later, once there is a way to measure whether it improves prediction.
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

export type PlayerRating = {
  rating: number;
  /** Games contributing to it — the denominator for how much to trust it. */
  games: number;
};

/** Probability the first side beats the second, given both sides' ratings. */
export function winProbability(sideA: number[], sideB: number[]): number {
  const strength = (ratings: number[]) =>
    ratings.reduce((sum, r) => sum + Math.exp(r / SCALE), 0);

  const a = strength(sideA);
  const b = strength(sideB);
  if (a + b === 0) return 0.5;
  return a / (a + b);
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
export function computeRatings(games: RatingGameRow[]): Map<number, PlayerRating> {
  const ordered = [...games]
    .sort((a, b) => a.id - b.id)
    .filter(g => g.winning_team !== null);

  let ratings = new Map<number, number>();

  for (let pass = 0; pass < PASSES; pass++) {
    // Carry the previous pass's ratings forward as priors; games counts restart
    // so the provisional K applies to a player's first games each time.
    const working = new Map(ratings);
    const played = new Map<number, number>();

    for (const game of ordered) {
      const team1 = game.team_1_members ?? [];
      const teamA = game.team_a_members ?? [];
      if (team1.length === 0 || teamA.length === 0) continue;

      const ratingOf = (id: number) => working.get(id) ?? STARTING_RATING;
      const r1 = team1.map(ratingOf);
      const rA = teamA.map(ratingOf);

      const p1 = winProbability(r1, rA);
      const team1Won = game.winning_team === 'team_1';

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
    if (pass === PASSES - 1) {
      const out = new Map<number, PlayerRating>();
      for (const [id, rating] of ratings) {
        out.set(id, { rating: Math.round(rating), games: played.get(id) ?? 0 });
      }
      return out;
    }
  }

  return new Map();
}
