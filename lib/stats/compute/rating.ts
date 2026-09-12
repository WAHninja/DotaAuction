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

/**
 * ── Rating deviation ────────────────────────────────────────────────────────
 *
 * Every rating carries an uncertainty, Glicko's central idea. It replaces the
 * two-tier provisional K this file used to have, which treated a player's 19th
 * game as maximally uncertain and their 21st as fully settled.
 *
 * RD does three jobs: it sets how far a result moves a rating, it is displayed
 * as a ± so an unproven number does not masquerade as a settled one, and it
 * decides who counts as provisional.
 *
 * Two things move it:
 *
 *   Playing shrinks it, weighted by how informative the game was. A result the
 *   model already predicted at 95% teaches almost nothing; a coin-flip game
 *   teaches the most. That is what the p·(1-p) term is — a game between evenly
 *   matched sides is worth roughly six times one between mismatched ones.
 *
 *   Sitting out inflates it. Measured in league games elapsed rather than
 *   wall-clock: games.finished_at is null for rows predating that column, so a
 *   time-based clock would silently treat the league's early history as
 *   simultaneous. League-game index is always present and always ordered.
 */
const RD_MAX = 350;
const RD_MIN = 50;

/**
 * Information gained from one maximally uncertain game.
 *
 * Tuned so a player reaches roughly RD 60 after 30 even games — settled, but
 * not so fast that a good week locks a rating in place.
 */
const RD_INFO = 3.6e-5;

/** RD regained per league game missed. Full decay takes a few hundred games. */
const RD_DECAY_PER_GAME = 15;

/** K at maximum and minimum uncertainty, interpolated linearly between. */
const K_MAX = 48;
const K_MIN = 12;

/**
 * Replay passes over the full history.
 *
 * Now one, down from three, so that the trajectory a player sees is the one
 * that actually happened: starting at 1500 and moving with each result.
 *
 * Three passes existed to solve the cold-start problem — early games rated
 * against uninformed estimates — by re-running with converged priors. Rating
 * deviation solves the same problem better. A new player starts at maximum
 * uncertainty and therefore maximum K, so their rating converges within their
 * first twenty or thirty games rather than needing the whole history replayed
 * at them. The extra passes were compensating for something that no longer
 * needs compensating for.
 *
 * The cost is a small shift in everyone's current rating, and slightly noisier
 * numbers for the league's earliest games. The gain is that intermediate
 * ratings are real: every point on the history chart is what that player's
 * rating was at that moment, predicted without knowledge of anything that
 * followed.
 */
const PASSES = 1;

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

/** One point on a player's rating trajectory. */
export type RatingPoint = {
  gameId: number;
  /** Rating immediately after this game. */
  rating: number;
  /** Movement from this game, positive or negative. */
  delta: number;
};

export type PlayerRating = {
  rating: number;
  /**
   * Rating after each game this player took part in, oldest first.
   *
   * Only meaningful because the replay is a single chronological pass. If the
   * multi-pass approach is ever restored, this becomes fiction and should be
   * removed rather than left to mislead.
   */
  history: RatingPoint[];
  /** Games contributing to it — the denominator for how much to trust it. */
  games: number;
  /**
   * Rating deviation: roughly a one-sigma band around the rating.
   *
   * A player at 1500 ±180 and one at 1500 ±55 are not making the same claim,
   * and displaying both as "1500" pretends they are.
   */
  rd: number;
  /** True while the rating is still settling and should not be read closely. */
  provisional: boolean;
};

/** Above this RD a rating has not yet earned to be taken at face value. */
export const PROVISIONAL_RD = 110;

/** K-factor for a given uncertainty — more doubt, larger steps. */
function kFactor(rd: number): number {
  const t = (rd - RD_MIN) / (RD_MAX - RD_MIN);
  return K_MIN + (K_MAX - K_MIN) * Math.min(1, Math.max(0, t));
}

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

    // RD restarts each pass while ratings carry over. Uncertainty is a claim
    // about how much *this* pass has learned, and inheriting a low RD would let
    // pass three refuse to move ratings it had every reason to revise.
    const deviation = new Map<number, number>();
    const lastSeen  = new Map<number, number>();
    const history   = new Map<number, RatingPoint[]>();

    predictions = [];

    for (let gameIndex = 0; gameIndex < ordered.length; gameIndex++) {
      const game = ordered[gameIndex];
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

      // How much this game had to teach. Highest at a coin flip, near zero when
      // the result was a foregone conclusion.
      const information = p1 * (1 - p1);

      for (const [members, teamDelta] of [
        [team1, delta1] as const,
        [teamA, deltaA] as const,
      ]) {
        const share = teamDelta / members.length;

        for (const id of members) {
          const n = played.get(id) ?? 0;

          // Inflate for absence before using the RD, so a returning player's
          // first game back moves them further than a regular's would.
          const missed = gameIndex - (lastSeen.get(id) ?? gameIndex);
          const carried = deviation.get(id) ?? RD_MAX;
          const rd = missed > 0
            ? Math.min(RD_MAX, Math.sqrt(carried ** 2 + missed * RD_DECAY_PER_GAME ** 2))
            : carried;

          const before = ratingOf(id);
          const after  = before + kFactor(rd) * share;
          working.set(id, after);

          // Rounded on the way in so the chart and the headline figure agree —
          // a trajectory ending at 1522.6 beside a card reading 1523 invites
          // exactly the wrong kind of scrutiny.
          const points = history.get(id) ?? [];
          points.push({
            gameId: game.id,
            rating: Math.round(after),
            delta:  Math.round(after) - Math.round(before),
          });
          history.set(id, points);

          // Then shrink it for having played. Combining precisions rather than
          // averaging is what makes repeated informative games converge.
          const shrunk = 1 / Math.sqrt(1 / rd ** 2 + RD_INFO * information);
          deviation.set(id, Math.max(RD_MIN, shrunk));

          played.set(id, n + 1);
          lastSeen.set(id, gameIndex);
        }
      }
    }

    ratings = working;

    // Last pass also records the games counts.
    if (pass === passes - 1) {
      const out = new Map<number, PlayerRating>();
      for (const [id, rating] of ratings) {
        // Final inflation for anyone who has not played recently, so a rating
        // reported today reflects how stale it actually is.
        const missed = ordered.length - (lastSeen.get(id) ?? ordered.length);
        const carried = deviation.get(id) ?? RD_MAX;
        const rd = Math.min(
          RD_MAX,
          Math.sqrt(carried ** 2 + Math.max(0, missed) * RD_DECAY_PER_GAME ** 2),
        );

        out.set(id, {
          rating:      Math.round(rating),
          history:     history.get(id) ?? [],
          games:       played.get(id) ?? 0,
          rd:          Math.round(rd),
          provisional: rd > PROVISIONAL_RD,
        });
      }
      return { ratings: out, predictions };
    }
  }

  return { ratings: new Map(), predictions: [] };
}
