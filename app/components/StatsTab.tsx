'use client'

import Image from 'next/image';
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import type { PlayerStats, TeamCombo } from '@/types';

// =============================================================================
// Constants — defined outside the component so they're never recreated on render
// =============================================================================

// Win rate is only shown once a player has this many games. Below this threshold
// a single lucky win skews the percentage to 100%, which tops the leaderboard
// and misleads everyone. The cell shows "—" with an explanatory tooltip instead.
const MIN_GAMES_FOR_RATE = 3;

// Extended sort key — adds timesOffered which is in PlayerStats but was missing
// from the shared SortKey type. Kept local to avoid a types-file change here.
type LocalSortKey =
  | 'username'
  | 'gamesWinRate'
  | 'offerAcceptRate'
  | 'averageOfferValue'
  | 'timesOffered'
  | 'timesSold'
  | 'netGold';

type Column = {
  label: string;
  sublabel?: string;
  key: LocalSortKey;
  tooltip: string;
};

// Static — never changes, no benefit to defining inside the component.
const COLUMNS: Column[] = [
  {
    label: 'Win Rate',
    sublabel: `min. ${MIN_GAMES_FOR_RATE} games`,
    key: 'gamesWinRate',
    tooltip: `Percentage of games won. Only displayed after ${MIN_GAMES_FOR_RATE}+ games — smaller samples are too noisy to be meaningful.`,
  },
  {
    label: 'Offers Accepted',
    sublabel: 'as seller',
    key: 'offerAcceptRate',
    tooltip: 'How often offers you submitted were accepted by the losing team. Influenced by competing offers and visible tier labels — not purely within your control.',
  },
  {
    label: 'Avg Bid',
    sublabel: 'when targeted',
    key: 'averageOfferValue',
    tooltip: 'Average gold your own teammates offered when putting you up for sale. Higher means they valued offloading you at a premium.',
  },
  {
    label: 'Targeted',
    sublabel: 'times offered',
    key: 'timesOffered',
    tooltip: 'How many times a teammate has put you up for sale in an auction, regardless of whether the offer was accepted.',
  },
  {
    label: 'Sold',
    sublabel: 'times transferred',
    key: 'timesSold',
    tooltip: 'How many times you have actually been transferred to the other team via an accepted offer.',
  },
  {
    label: 'Net Gold',
    sublabel: 'all time',
    key: 'netGold',
    tooltip: 'Sum of all win rewards and auction payouts, minus all loss penalties, across every game played.',
  },
];

// =============================================================================
// Helpers
// =============================================================================

function pct(success: number, total: number): number {
  return total > 0 ? +(success / total * 100).toFixed(1) : 0;
}

// Avoids trailing zeros: 1000 → "1k", 1500 → "1.5k", 2000 → "2k"
function formatGold(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const k = value / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return value.toString();
}

function pctColour(value: number): string {
  if (value >= 60) return 'text-dota-radiant-light bg-dota-radiant/10 border-dota-radiant/30';
  if (value >= 40) return 'text-dota-gold       bg-dota-gold/10       border-dota-gold/30';
  return                  'text-dota-dire-light  bg-dota-dire/10       border-dota-dire/30';
}

// =============================================================================
// Sub-components
// =============================================================================

// ── Tooltip ───────────────────────────────────────────────────────────────────
// Accessible via aria-describedby on the trigger element.
// Visible on hover and focus-within (keyboard users see it when the button
// inside is focused). role="tooltip" registers it with assistive tech.
function Tooltip({ id, content, children }: { id: string; content: string; children: ReactNode }) {
  return (
    <div className="relative group inline-flex justify-center">
      {children}
      <div
        id={id}
        role="tooltip"
        className="
          pointer-events-none
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20
          w-56 px-3 py-2 rounded
          bg-dota-raised border border-dota-border-bright
          font-barlow text-xs text-dota-text-muted leading-snug
          opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
          transition-opacity duration-150
          text-left whitespace-normal
        "
      >
        {content}
        {/* Downward arrow */}
        <span
          aria-hidden="true"
          className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-dota-border-bright"
        />
      </div>
    </div>
  );
}

// ── PctBadge ──────────────────────────────────────────────────────────────────
// Shows "—" when total is 0 OR below the minimum sample threshold.
function PctBadge({
  success,
  total,
  minGames = 0,
}: {
  success: number;
  total: number;
  minGames?: number;
}) {
  if (total === 0) {
    return <span className="text-dota-text-dim text-xs">—</span>;
  }
  if (total < minGames) {
    return (
      <span
        className="text-dota-text-dim text-xs"
        title={`Need ${minGames} games (has ${total})`}
      >
        —
      </span>
    );
  }
  const rate = pct(success, total);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-barlow text-xs font-semibold ${pctColour(rate)}`}
    >
      {rate}%
      <span className="text-[10px] opacity-50 font-normal">{success}/{total}</span>
    </span>
  );
}

// ── GoldValue ─────────────────────────────────────────────────────────────────
// Arrow icons (not Trending*) — net gold is a cumulative sum, not a time-series
// trend. TrendingUp/Down imply directional movement over time which is wrong here.
function GoldValue({ value }: { value: number }) {
  const colour =
    value > 0 ? 'text-dota-radiant-light' :
    value < 0 ? 'text-dota-dire-light'    :
                'text-dota-text-muted';
  return (
    <span className={`flex items-center justify-center gap-1 font-barlow font-semibold tabular-nums ${colour}`}>
      {value > 0
        ? <ArrowUp   className="w-3 h-3 shrink-0" aria-hidden="true" />
        : value < 0
        ? <ArrowDown className="w-3 h-3 shrink-0" aria-hidden="true" />
        : <Minus     className="w-3 h-3 shrink-0" aria-hidden="true" />
      }
      <span>{value > 0 ? '+' : ''}{formatGold(value)}</span>
      <Image src="/Gold_symbol.webp" alt="Gold" width={13} height={13} className="inline-block" />
    </span>
  );
}

// ── SortIcon ──────────────────────────────────────────────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 opacity-30" aria-hidden="true" />;
  return dir === 'desc'
    ? <ChevronDown className="w-3 h-3 text-dota-gold" aria-hidden="true" />
    : <ChevronUp   className="w-3 h-3 text-dota-gold" aria-hidden="true" />;
}

// =============================================================================
// Types
// =============================================================================

type EnrichedPlayer = PlayerStats & {
  gamesWinRate: number;    // pct — or -1 if below MIN_GAMES_FOR_RATE
  offerAcceptRate: number; // pct
};

// =============================================================================
// StatsTab
// =============================================================================

export default function StatsTab() {
  const [players, setPlayers]           = useState<PlayerStats[]>([]);
  const [combos, setCombos]             = useState<TeamCombo[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [sortKey, setSortKey]           = useState<LocalSortKey>('gamesWinRate');
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc');
  const [showAllCombos, setShowAllCombos] = useState(false);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setPlayers(data.players ?? []);
        setCombos(data.topWinningCombos ?? []);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load statistics');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (key: LocalSortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'username' ? 'asc' : 'desc');
    }
  };

  // Enrich with computed rates. gamesWinRate is -1 for below-threshold players
  // so they sort to the bottom when sorting descending by win rate.
  const enrichedPlayers = useMemo<EnrichedPlayer[]>(() =>
    players.map(p => ({
      ...p,
      gamesWinRate:    p.gamesPlayed >= MIN_GAMES_FOR_RATE
                         ? pct(p.gamesWon, p.gamesPlayed)
                         : -1,
      offerAcceptRate: pct(p.offersAccepted, p.offersMade),
    })),
    [players]
  );

  const sortedPlayers = useMemo<EnrichedPlayer[]>(() => {
    return [...enrichedPlayers].sort((a, b) => {
      // Access by key — all LocalSortKey values are valid keys of EnrichedPlayer
      const aVal = a[sortKey as keyof EnrichedPlayer];
      const bVal = b[sortKey as keyof EnrichedPlayer];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [enrichedPlayers, sortKey, sortDir]);

  // Medals are only shown when the table is sorted by win rate descending.
  // If we showed them on any sort, 🥇 would go to e.g. the player with the
  // most negative net gold when sorting ascending — actively misleading.
  const showMedals = sortKey === 'gamesWinRate' && sortDir === 'desc';

  // Show all combos or just the first 5
  const visibleCombos = showAllCombos ? combos : combos.slice(0, 5);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="panel p-8 text-center font-barlow text-dota-text-muted">
        Loading statistics…
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="panel p-8 text-center font-barlow text-dota-dire-light">
        {error}
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────────
  // Render outside the table skeleton so the user gets a clean empty state
  // instead of a full table scaffold with a single "no data" row inside it.
  if (sortedPlayers.length === 0) {
    return (
      <div className="space-y-8">
        <div className="panel p-12 text-center font-barlow text-dota-text-dim">
          No player data yet — complete a game to see stats.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Player Leaderboard ─────────────────────────────────────────────── */}
      <div className="panel overflow-hidden">

        <div className="px-5 py-4 border-b border-dota-border flex items-baseline justify-between">
          <div>
            <h3 className="font-cinzel text-lg font-bold text-dota-gold">Player Leaderboard</h3>
            <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
              Click any column to sort · Medals shown for win rate ranking only
            </p>
          </div>
        </div>

        {/*
          Scroll wrapper + right-edge fade.
          The fade gradient signals to mobile users that the table continues
          horizontally — without it, hidden columns look like missing data.
          lg:hidden because on large screens the table fits without scrolling.
        */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-dota-surface to-transparent z-10 lg:hidden"
          />
          <div className="overflow-x-auto">
            <table className="min-w-full font-barlow text-sm text-dota-text">

              <thead>
                <tr className="bg-dota-deep border-b border-dota-border">

                  {/* Rank */}
                  <th
                    scope="col"
                    className="px-3 py-3 w-10 text-dota-text-dim font-medium text-xs text-center"
                    aria-label="Rank"
                  >
                    #
                  </th>

                  {/* Player name — sortable */}
                  <th
                    scope="col"
                    aria-sort={
                      sortKey === 'username'
                        ? sortDir === 'asc' ? 'ascending' : 'descending'
                        : 'none'
                    }
                    className="px-3 py-3 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort('username')}
                      className="
                        flex items-center gap-1
                        font-barlow font-semibold text-xs
                        text-dota-text-muted hover:text-dota-text
                        transition-colors
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-dota-gold focus-visible:ring-offset-1
                        focus-visible:ring-offset-dota-deep rounded
                      "
                    >
                      Player
                      <SortIcon active={sortKey === 'username'} dir={sortDir} />
                    </button>
                  </th>

                  {/* Stat columns */}
                  {COLUMNS.map(col => {
                    const tooltipId  = `col-tooltip-${col.key}`;
                    const isActive   = sortKey === col.key;
                    const ariaSortValue =
                      isActive
                        ? sortDir === 'asc' ? 'ascending' : 'descending'
                        : 'none';

                    return (
                      <th
                        key={col.key}
                        scope="col"
                        aria-sort={ariaSortValue as 'ascending' | 'descending' | 'none'}
                        className="px-3 py-3 text-center"
                      >
                        <Tooltip id={tooltipId} content={col.tooltip}>
                          <button
                            type="button"
                            onClick={() => handleSort(col.key)}
                            aria-describedby={tooltipId}
                            className={`
                              flex flex-col items-center gap-0.5 mx-auto
                              font-barlow font-semibold text-xs whitespace-nowrap
                              transition-colors
                              focus-visible:outline-none focus-visible:ring-2
                              focus-visible:ring-dota-gold focus-visible:ring-offset-1
                              focus-visible:ring-offset-dota-deep rounded
                              ${isActive
                                ? 'text-dota-gold'
                                : 'text-dota-text-muted hover:text-dota-text'
                              }
                            `}
                          >
                            <span className="flex items-center gap-1">
                              {col.label}
                              <SortIcon active={isActive} dir={sortDir} />
                            </span>
                            {col.sublabel && (
                              <span className="text-[10px] opacity-40 tracking-normal normal-case font-normal">
                                {col.sublabel}
                              </span>
                            )}
                          </button>
                        </Tooltip>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {sortedPlayers.map((p, i) => (
                  <tr
                    key={p.username}
                    className={`
                      border-b border-dota-border/50 transition-colors
                      ${showMedals && i === 0
                        ? 'bg-dota-gold/5 hover:bg-dota-gold/8'
                        : 'hover:bg-dota-overlay/40'
                      }
                    `}
                  >
                    {/* Rank — medals only when sorted by win rate descending */}
                    <td className="px-3 py-3 text-center text-xs font-bold">
                      {showMedals
                        ? (
                          <span className={
                            i === 0 ? 'text-dota-gold'       :
                            i === 1 ? 'text-dota-text-muted' :
                            i === 2 ? 'text-amber-600'        :
                                      'text-dota-text-dim'
                          }>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </span>
                        )
                        : <span className="text-dota-text-dim">{i + 1}</span>
                      }
                    </td>

                    {/* Name + games played */}
                    <td className="px-3 py-3">
                      <span className={`font-semibold ${showMedals && i === 0 ? 'text-dota-gold' : 'text-dota-text'}`}>
                        {p.username}
                      </span>
                      {p.gamesPlayed > 0 && (
                        <span className="ml-2 text-[10px] text-dota-text-dim">{p.gamesPlayed}g</span>
                      )}
                    </td>

                    {/* Win Rate — hidden below MIN_GAMES_FOR_RATE */}
                    <td className="px-3 py-3 text-center">
                      <PctBadge
                        success={p.gamesWon}
                        total={p.gamesPlayed}
                        minGames={MIN_GAMES_FOR_RATE}
                      />
                    </td>

                    {/* Offers Accepted (as seller) */}
                    <td className="px-3 py-3 text-center">
                      <PctBadge success={p.offersAccepted} total={p.offersMade} />
                    </td>

                    {/* Avg Bid — shown only when targeted at least once */}
                    <td className="px-3 py-3 text-center">
                      {p.timesOffered > 0 ? (
                        <span className="inline-flex items-center justify-center gap-1 text-dota-gold font-semibold tabular-nums">
                          {p.averageOfferValue.toFixed(0)}
                          <Image src="/Gold_symbol.webp" alt="Gold" width={13} height={13} className="inline-block" />
                        </span>
                      ) : (
                        <span className="text-dota-text-dim text-xs">—</span>
                      )}
                    </td>

                    {/* Targeted (timesOffered) */}
                    <td className="px-3 py-3 text-center">
                      {p.timesOffered > 0
                        ? <span className="font-barlow font-semibold text-dota-text-muted">{p.timesOffered}</span>
                        : <span className="text-dota-text-dim text-xs">—</span>
                      }
                    </td>

                    {/* Sold (timesSold) */}
                    <td className="px-3 py-3 text-center">
                      {p.timesSold > 0
                        ? <span className="text-dota-info font-semibold">{p.timesSold}</span>
                        : <span className="text-dota-text-dim text-xs">—</span>
                      }
                    </td>

                    {/* Net Gold */}
                    <td className="px-3 py-3">
                      <GoldValue value={p.netGold} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-5 py-2.5 border-t border-dota-border">
          <p className="font-barlow text-[11px] text-dota-text-dim">
            Avg Bid is the gold teammates offered when selling you.
            Net Gold sums all win rewards, loss penalties, and auction payouts.
            Win Rate requires {MIN_GAMES_FOR_RATE}+ games.
          </p>
        </div>
      </div>

      {/* ── Top Winning Combinations ───────────────────────────────────────── */}
      <div className="panel overflow-hidden">

        <div className="px-5 py-4 border-b border-dota-border">
          <h3 className="font-cinzel text-lg font-bold text-dota-gold">Top Winning Combinations</h3>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            Most frequent winning team compositions
          </p>
        </div>

        <div className="p-4">
          {combos.length === 0 ? (
            <p className="text-center font-barlow text-dota-text-dim py-6">No completed games yet.</p>
          ) : (
            <>
              {/*
                Flat ranked list — no progress bars.
                The previous relative-scale bars (always 100% for #1, proportionally
                less for others) made small gaps look dramatic. Win counts speak clearly
                on their own without a bar chart that has no meaningful baseline.
              */}
              <ul className="space-y-2">
                {visibleCombos.map((c, i) => (
                  <li
                    key={c.combo}
                    className="panel-sunken p-3 flex items-center gap-3"
                  >
                    <span className="font-barlow text-sm font-bold w-6 text-center shrink-0">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </span>
                    <span className="truncate font-barlow font-semibold text-sm text-dota-text flex-1 min-w-0">
                      {c.combo}
                    </span>
                    <span className="font-barlow font-bold text-sm text-dota-radiant-light whitespace-nowrap tabular-nums shrink-0">
                      {c.wins} {c.wins === 1 ? 'win' : 'wins'}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Show more / less — exposes all combos returned by the API */}
              {combos.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllCombos(v => !v)}
                  className="btn-ghost w-full mt-3 text-xs py-1.5"
                >
                  {showAllCombos ? 'Show less' : `Show all ${combos.length}`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

    </div>
  );
}
