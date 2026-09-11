'use client';

import { TrendingUp } from 'lucide-react';
import type { WinStreak } from '@/types';
import { pct } from '@/lib/stats/format';
import FormGuide from '@/app/components/stats/ui/FormGuide';

/**
 * Recent results and the player's best run.
 *
 * Acquisition impact used to sit here and has been removed rather than fixed.
 * It asked whether a traded player won their next game — but a traded player is
 * by definition joining the side that just lost, so the figure was structurally
 * depressed for everyone and largely measured that fact rather than the player.
 * It also had no counterfactual, so it could not separate "this player improved
 * the team" from "that team was going to bounce back anyway". A version with a
 * proper before/after baseline for the receiving team would be worth building;
 * a version without one is worse than nothing, because it looks like an answer.
 *
 * What replaced it is the first time-aware figure in the app. Every other stat
 * is an all-time aggregate, in which a player who has improved sharply looks
 * identical to one who peaked a year ago.
 */
export default function FormPanel({ streak, recentForm }: {
  streak:     WinStreak | null;
  recentForm: ('W' | 'L')[];
}) {
  const hasStreak = streak !== null && streak.longestStreak > 0;

  // Nothing to say at all is possible for a player with no finished games.
  if (recentForm.length === 0 && !hasStreak) return null;

  const wins = recentForm.filter(r => r === 'W').length;

  return (
    <section className="panel overflow-hidden">
      <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3">
        <TrendingUp className="w-4 h-4 shrink-0 text-dota-gold" aria-hidden="true" />
        <div>
          <h2 className="font-cinzel text-lg font-bold text-dota-gold">Form</h2>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            Most recent results, latest on the right
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {recentForm.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <FormGuide form={recentForm} />
            <span className="font-barlow text-sm text-dota-text-muted tabular-nums">
              {wins}–{recentForm.length - wins} in the last {recentForm.length}
              <span className="text-dota-text-dim">
                {' '}({pct(wins, recentForm.length)}%)
              </span>
            </span>
          </div>
        )}

        {hasStreak && (
          <div className="panel-sunken px-4 py-3 inline-block">
            <p className="stat-label">Longest win streak</p>
            <p className="font-barlow text-xl font-bold text-dota-gold tabular-nums mt-0.5">
              {streak.longestStreak}
            </p>
            <p className="font-barlow text-[11px] text-dota-text-dim mt-1 tabular-nums">
              consecutive games · match #{streak.matchId}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
