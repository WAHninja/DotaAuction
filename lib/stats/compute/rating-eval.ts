/**
 * Does the gold term actually improve predictions?
 *
 * The point of building the rating as an explicit expectation model is that
 * every factor can be tested rather than assumed. This scores the model at a
 * range of gold weights and reports which does best, so the answer to "should
 * gold be in the rating" is a measurement instead of an opinion.
 *
 * ── Evaluated on a single pass, deliberately ────────────────────────────────
 *
 * Ratings normally converge over three passes. Scoring those would be
 * self-congratulatory: by pass three the model has already seen every result it
 * is being asked to predict, so it would score well even if the gold term were
 * noise.
 *
 * A single chronological pass makes each prediction genuinely blind — the model
 * predicts game N knowing only games 1 to N-1. That is prequential evaluation,
 * and it is the honest version. It also means the reported accuracy is
 * pessimistic relative to how the finished ratings perform, because early
 * predictions are made with nothing to go on.
 *
 * ── Log loss, not just accuracy ─────────────────────────────────────────────
 *
 * Accuracy only asks whether the favourite won. Log loss asks how confident the
 * model was, and punishes confident mistakes — which is what actually
 * distinguishes a well-calibrated model from one that happens to pick winners.
 * Both are reported; log loss decides.
 */

import { replay, type RatingGameRow } from '@/lib/stats/compute/rating';
import type { GoldTimeline } from '@/lib/stats/compute/gold-timeline';

/** Gold weights tried. 0 is the control — the model without gold at all. */
export const GOLD_WEIGHT_CANDIDATES = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4] as const;

export type ModelScore = {
  goldWeight: number;
  /** Mean negative log likelihood. Lower is better; 0.693 is a coin flip. */
  logLoss: number;
  /** Share of games where the favourite won. */
  accuracy: number;
  gamesScored: number;
};

export type ModelEvaluation = {
  /** The weight with the lowest log loss. */
  best: ModelScore;
  /** The same model with gold disabled, for comparison. */
  withoutGold: ModelScore;
  /** Every candidate, for inspection. */
  all: ModelScore[];
  /** Whether the gold term measurably helps. */
  goldHelps: boolean;
};

function score(
  games: RatingGameRow[],
  goldTimeline: GoldTimeline | undefined,
  goldWeight: number,
): ModelScore {
  const { predictions } = replay(games, { goldWeight, goldTimeline, passes: 1 });

  if (predictions.length === 0) {
    return { goldWeight, logLoss: 0, accuracy: 0, gamesScored: 0 };
  }

  let loss = 0;
  let correct = 0;

  for (const p of predictions) {
    // Clamped away from 0 and 1: a confident miss would otherwise be an
    // infinite penalty and take the whole average with it.
    const q = Math.min(1 - 1e-9, Math.max(1e-9, p.expected));
    loss += -(p.actual * Math.log(q) + (1 - p.actual) * Math.log(1 - q));

    // A coin-flip prediction is scored as a miss rather than a half — it made
    // no call, and rewarding it would flatter a model that never commits.
    if ((q > 0.5 && p.actual === 1) || (q < 0.5 && p.actual === 0)) correct += 1;
  }

  return {
    goldWeight,
    logLoss:     +(loss / predictions.length).toFixed(4),
    accuracy:    +(correct / predictions.length).toFixed(4),
    gamesScored: predictions.length,
  };
}

export function evaluateModel(
  games: RatingGameRow[],
  goldTimeline: GoldTimeline,
): ModelEvaluation {
  const all = GOLD_WEIGHT_CANDIDATES.map(w => score(games, goldTimeline, w));

  const withoutGold = all.find(s => s.goldWeight === 0)!;
  const best = all.reduce((a, b) => (b.logLoss < a.logLoss ? b : a));

  return {
    all,
    best,
    withoutGold,
    // A margin, not just "lower". Fitting eight candidates to one small dataset
    // will always find one that edges out the control by a hair; requiring a
    // visible improvement stops noise being promoted to a feature.
    goldHelps: withoutGold.logLoss - best.logLoss > 0.005,
  };
}
