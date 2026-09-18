'use client';

import { useState } from 'react';
import { ChevronDown as SelectChevron } from 'lucide-react';
import type { StatsPayload } from '@/types';
import { forPlayer, headToHeadFor } from '@/lib/stats/select';
import { Info } from 'lucide-react';
import { pct, formatStrength } from '@/lib/stats/format';
import { GLOSSARY } from '@/lib/stats/glossary';
import Tooltip from '@/app/components/stats/ui/Tooltip';
import { MIN_GAMES_FOR_RATE, MIN_OFFERS_FOR_STRENGTH, MIN_SALES_FOR_IMPACT } from '@/lib/stats/constants';
import PlayerAvatar from '@/app/components/PlayerAvatar';

/**
 * Puts a second player beside the subject, metric for metric.
 *
 * Ranks answer "where do I sit in the league"; this answers "am I better than
 * him", which is the question a friend group actually argues about. The two are
 * not interchangeable — two players can be 3rd and 4th on win rate and still
 * have a lopsided head-to-head record.
 *
 * The head-to-head line is the reason this belongs here rather than being two
 * player pages open in separate tabs: it is the one figure that only exists for
 * a pair.
 */

type Metric = {
  label: string;
  /** Same wording as the ranked strip above — the reader should not meet two
   *  different explanations of the same figure on one page. */
  hint: string;
  hintId: string;
  /** Formatted for display, or null when the player has no value at all. */
  value: (p: ReturnType<typeof forPlayer>) => string | null;
  /** Numeric for the winner comparison. null means "not comparable". */
  compare: (p: ReturnType<typeof forPlayer>) => number | null;
};

/**
 * Deliberately all rate/skill figures, not counts.
 *
 * Games and Times sold used to sit here and both were pure volume — whoever
 * had played more or been sold more simply won that row regardless of skill,
 * which answers "who's been around longer" rather than "who's better". Every
 * metric below already normalises for how much someone's played (a rate, an
 * index, or an Elo-style rating), so the row a player wins is the row they
 * actually earned.
 */
const METRICS: Metric[] = [
  {
    label: 'Rating',
    hint: GLOSSARY.rating, hintId: 'cmp-rating',
    // Hidden while provisional rather than shown with an asterisk — a rating
    // that's still settling is exactly the kind of number this comparison
    // exists to get right, and the same caveat wouldn't survive being crammed
    // into one row the way it gets room to breathe on the player header.
    value: p => (p.core && !p.core.ratingProvisional ? String(p.core.rating) : null),
    compare: p => (p.core && !p.core.ratingProvisional ? p.core.rating : null),
  },
  {
    label: 'Win rate',
    hint: GLOSSARY.winRate, hintId: 'cmp-winrate',
    // Below the sample threshold there is no honest figure to compare, so the
    // row shows a dash for that player and the comparison is skipped entirely
    // rather than crowning someone on three games.
    value: p =>
      p.core && p.core.gamesPlayed >= MIN_GAMES_FOR_RATE
        ? `${pct(p.core.gamesWon, p.core.gamesPlayed)}%`
        : null,
    compare: p =>
      p.core && p.core.gamesPlayed >= MIN_GAMES_FOR_RATE
        ? pct(p.core.gamesWon, p.core.gamesPlayed)
        : null,
  },
  {
    label: 'Market value',
    hint: GLOSSARY.marketValue, hintId: 'cmp-market',
    value: p =>
      p.core && p.core.timesOffered >= MIN_OFFERS_FOR_STRENGTH
        ? formatStrength(p.core.offerStrengthReceived)
        : null,
    compare: p =>
      p.core && p.core.timesOffered >= MIN_OFFERS_FOR_STRENGTH
        ? p.core.offerStrengthReceived
        : null,
  },
  {
    label: 'Avg KDA',
    hint: GLOSSARY.avgKda, hintId: 'cmp-kda',
    // No tone override here (there used to be one, tiering the colour off the
    // raw KDA value regardless of the other side's number) — every other row
    // in this comparison is gold-for-whoever's-higher, and KDA read as
    // inconsistent sitting next to them with its own independent colour
    // scale. kdaColour is still the right call on the player page, where a
    // KDA is shown alone with nothing to be "higher than" — just not here,
    // where the whole point of the row is A vs B.
    value:   p => (p.dota ? p.dota.avgKda.toFixed(2) : null),
    compare: p => p.dota?.avgKda ?? null,
  },
  {
    label: 'Impact after being sold',
    hint: GLOSSARY.saleImpact, hintId: 'cmp-impact',
    value: p =>
      p.core && p.core.impactOpportunities >= MIN_SALES_FOR_IMPACT
        ? `${pct(p.core.impactWins, p.core.impactOpportunities)}%`
        : null,
    compare: p =>
      p.core && p.core.impactOpportunities >= MIN_SALES_FOR_IMPACT
        ? pct(p.core.impactWins, p.core.impactOpportunities)
        : null,
  },
];

export default function ComparePicker({ payload, subject }: {
  payload: StatsPayload;
  subject: string;
}) {
  const [other, setOther] = useState('');

  const options = payload.players
    .map(p => p.username)
    .filter(name => name !== subject)
    .sort((a, b) => a.localeCompare(b));

  if (options.length === 0) return null;

  const left  = forPlayer(payload, subject);
  const right = other ? forPlayer(payload, other) : null;

  // The payload carries an avatar per player, so both sides get a real
  // portrait instead of the initials fallback.
  const leftAvatar  = left.core?.steamAvatar ?? null;
  const rightAvatar = right?.core?.steamAvatar ?? null;

  // Oriented from the subject's side, so wins are always the subject's wins.
  const h2h = other
    ? headToHeadFor(payload.headToHead, subject).find(r => r.opponent === other) ?? null
    : null;

  return (
    <section className="panel overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-dota-border flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-cinzel text-lg font-bold text-dota-gold">Compare</h2>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            Put another player side by side
          </p>
        </div>

        <div className="relative">
          <select
            value={other}
            onChange={e => setOther(e.target.value)}
            aria-label={`Compare ${subject} with another player`}
            className="select"
          >
            <option value="">Select a player…</option>
            {options.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <SelectChevron
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dota-text-muted"
            aria-hidden="true"
          />
        </div>
      </div>

      {!other ? (
        <p className="font-barlow text-sm text-dota-text-dim py-8 text-center flex-1 flex items-center justify-center">
          Pick a player to compare against {subject}.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-4 border-b border-dota-border/40">
            <div className="flex items-center gap-2 min-w-0 justify-end">
              <span className="font-barlow font-bold text-dota-text truncate">{subject}</span>
              <PlayerAvatar username={subject} steamAvatar={leftAvatar} size={28} />
            </div>
            <span className="stat-label px-2">vs</span>
            <div className="flex items-center gap-2 min-w-0">
              <PlayerAvatar username={other} steamAvatar={rightAvatar} size={28} />
              <span className="font-barlow font-bold text-dota-text truncate">{other}</span>
            </div>
          </div>

          {h2h && (
            <div className="px-5 py-3 border-b border-dota-border/40 text-center">
              <p className="stat-label">Head-to-head</p>
              <p className="font-barlow text-lg font-bold text-dota-gold tabular-nums">
                {h2h.wins}–{h2h.losses}
                <span className="text-dota-text-dim text-xs font-normal">
                  {' '}over {h2h.games} {h2h.games === 1 ? 'game' : 'games'}
                </span>
              </p>
            </div>
          )}

          <dl className="divide-y divide-dota-border/30">
            {METRICS.map(m => {
              const lv = m.value(left);
              const rv = right ? m.value(right) : null;
              const ln = m.compare(left);
              const rn = right ? m.compare(right) : null;

              // Only crown a winner when both sides have a real number.
              const leftWins  = ln !== null && rn !== null && ln > rn;
              const rightWins = ln !== null && rn !== null && rn > ln;

              return (
                <div key={m.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-2.5">
                  <span className={`font-barlow text-right tabular-nums font-semibold ${
                    leftWins ? 'text-dota-gold' : 'text-dota-text-muted'
                  }`}>
                    {lv ?? '—'}
                  </span>
                  <Tooltip id={m.hintId} content={m.hint}>
                    <span
                      className="stat-label whitespace-nowrap px-2 inline-flex items-center gap-1 cursor-help"
                      tabIndex={0}
                      aria-describedby={m.hintId}
                    >
                      {m.label}
                      <Info className="w-3 h-3 opacity-40 shrink-0" aria-hidden="true" />
                    </span>
                  </Tooltip>
                  <span className={`font-barlow tabular-nums font-semibold ${
                    rightWins ? 'text-dota-gold' : 'text-dota-text-muted'
                  }`}>
                    {rv ?? '—'}
                  </span>
                </div>
              );
            })}
          </dl>
        </>
      )}
    </section>
  );
}
