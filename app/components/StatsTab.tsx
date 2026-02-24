'use client'

import Image from 'next/image';
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ArrowUp, ArrowDown, Minus, Repeat2, Target, TrendingUp } from 'lucide-react'
import type { PlayerStats, TeamCombo } from '@/types';

// =============================================================================
// Constants — defined outside the component so they're never recreated on render
// =============================================================================

const MIN_GAMES_FOR_RATE = 3;

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
// Direction: top-full (downward into the table body).
//
// Why not bottom-full (upward)? The tooltip lives inside an overflow-x-auto
// scroll wrapper. CSS does not allow overflow: auto on one axis and
// overflow: visible on the other — the browser upgrades visible to auto,
// clipping any absolutely-positioned descendant that tries to escape upward.
// Pointing downward keeps the tooltip inside the scroll container where
// clipping doesn't apply. The arrow now points upward to the trigger.
function Tooltip({ id, content, children }: { id: string; content: string; children: ReactNode }) {
  return (
    <div className="relative group inline-flex justify-center">
      {children}
      <div
        id={id}
        role="tooltip"
        className="
          pointer-events-none
          absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20
          w-56 px-3 py-2 rounded
          bg-dota-raised border border-dota-border-bright
          font-barlow text-xs text-dota-text-muted leading-snug
          opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
          transition-opacity duration-150
          text-left whitespace-normal
        "
      >
        {/* Upward arrow — points toward the trigger button above */}
        <span
          aria-hidden="true"
          className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-dota-border-bright"
        />
        {content}
      </div>
    </div>
  );
}

// ── PctBadge ──────────────────────────────────────────────────────────────────
function PctBadge({
  success,
  total,
  minGames = 0,
}: {
  success: number;
  total: number;
  minGames?: number;
}) {
  if (total === 0) return <span className="text-dota-text-dim text-xs">—</span>;
  if (total < minGames) {
    return (
      <span className="text-dota-text-dim text-xs" title={`Need ${minGames} games (has ${total})`}>
        —
      </span>
    );
  }
  const rate = pct(success, total);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-barlow text-xs font-semibold ${pctColour(rate)}`}>
      {rate}%
      <span className="text-[10px] opacity-50 font-normal">{success}/{total}</span>
    </span>
  );
}

// ── GoldValue ─────────────────────────────────────────────────────────────────
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
  gamesWinRate: number;
  offerAcceptRate: number;
};

// =============================================================================
// Auction Insights helpers
// =============================================================================

// A player who has been targeted at least once is a valid "most targeted" entry.
// A player who has made at least one offer is valid for sell-through rate.

type AuctionInsight = {
  username: string;
  value: string;
  subValue?: string;
};

function deriveAuctionInsights(players: PlayerStats[]): {
  mostTargeted: AuctionInsight[];
  bestSellers: AuctionInsight[];
  totalOffersPerGame: string;
  overallSoldThroughRate: string;
} {
  const active = players.filter(p => p.gamesPlayed > 0);

  // Most targeted — ordered by timesOffered DESC
  const mostTargeted: AuctionInsight[] = [...active]
    .filter(p => p.timesOffered > 0)
    .sort((a, b) => b.timesOffered - a.timesOffered)
    .slice(0, 3)
    .map(p => {
      const soldRate = p.timesOffered > 0 ? pct(p.timesSold, p.timesOffered) : 0;
      return {
        username: p.username,
        value: `${p.timesOffered}×`,
        subValue: `sold ${soldRate}%`,
      };
    });

  // Best sellers — among players who made ≥ 2 offers (enough sample to be meaningful)
  const bestSellers: AuctionInsight[] = [...active]
    .filter(p => p.offersMade >= 2)
    .sort((a, b) => {
      const rateA = pct(a.offersAccepted, a.offersMade);
      const rateB = pct(b.offersAccepted, b.offersMade);
      return rateB - rateA;
    })
    .slice(0, 3)
    .map(p => ({
      username: p.username,
      value: `${pct(p.offersAccepted, p.offersMade)}%`,
      subValue: `${p.offersAccepted}/${p.offersMade} offers`,
    }));

  // Total offers across all players / total games played
  const totalOffers = active.reduce((sum, p) => sum + p.offersMade, 0);
  // gamesPlayed is per-player (counts each player's games); divide by avg team size
  // to approximate game count. We use the max gamesPlayed as a proxy since all
  // players in a match play the same games — close enough for a display stat.
  const maxGames = active.length > 0 ? Math.max(...active.map(p => p.gamesPlayed)) : 0;
  const offersPerGame = maxGames > 0
    ? (totalOffers / maxGames).toFixed(1)
    : '—';

  // Overall sold-through rate: all accepted / all made
  const totalMade     = active.reduce((sum, p) => sum + p.offersMade, 0);
  const totalAccepted = active.reduce((sum, p) => sum + p.offersAccepted, 0);
  const soldThroughRate = totalMade > 0
    ? `${pct(totalAccepted, totalMade)}%`
    : '—';

  return {
    mostTargeted,
    bestSellers,
    totalOffersPerGame: offersPerGame,
    overallSoldThroughRate: soldThroughRate,
  };
}

// =============================================================================
// StatsTab
// =============================================================================

export default function StatsTab() {
  const [players, setPlayers]             = useState<PlayerStats[]>([]);
  const [combos, setCombos]               = useState<TeamCombo[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [sortKey, setSortKey]             = useState<LocalSortKey>('gamesWinRate');
  const [sortDir, setSortDir]             = useState<'asc' | 'desc'>('desc');
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

  const showMedals = sortKey === 'gamesWinRate' && sortDir === 'desc';
  const visibleCombos = showAllCombos ? combos : combos.slice(0, 5);
  const auctionInsights = useMemo(() => deriveAuctionInsights(players), [players]);

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
              Click any column to sort
            </p>
          </div>
        </div>

        {/*
          Scroll wrapper + right-edge fade.
          overflow-x-auto clips absolutely-positioned children that escape
          upward, so tooltips are anchored downward (top-full) instead.
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

                  <th
                    scope="col"
                    className="px-3 py-3 w-10 text-dota-text-dim font-medium text-xs text-center"
                    aria-label="Rank"
                  >
                    #
                  </th>

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

                  {COLUMNS.map(col => {
                    const tooltipId = `col-tooltip-${col.key}`;
                    const isActive  = sortKey === col.key;
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

                    <td className="px-3 py-3">
                      <span className={`font-semibold ${showMedals && i === 0 ? 'text-dota-gold' : 'text-dota-text'}`}>
                        {p.username}
                      </span>
                      {p.gamesPlayed > 0 && (
                        <span className="ml-2 text-[10px] text-dota-text-dim">{p.gamesPlayed}g</span>
                      )}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <PctBadge
                        success={p.gamesWon}
                        total={p.gamesPlayed}
                        minGames={MIN_GAMES_FOR_RATE}
                      />
                    </td>

                    <td className="px-3 py-3 text-center">
                      <PctBadge success={p.offersAccepted} total={p.offersMade} />
                    </td>

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

                    <td className="px-3 py-3 text-center">
                      {p.timesOffered > 0
                        ? <span className="font-barlow font-semibold text-dota-text-muted">{p.timesOffered}</span>
                        : <span className="text-dota-text-dim text-xs">—</span>
                      }
                    </td>

                    <td className="px-3 py-3 text-center">
                      {p.timesSold > 0
                        ? <span className="text-dota-info font-semibold">{p.timesSold}</span>
                        : <span className="text-dota-text-dim text-xs">—</span>
                      }
                    </td>

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

      {/* ── Bottom row: two cards side-by-side ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Auction House Insights ───────────────────────────────────────── */}
        <div className="panel overflow-hidden">

          <div className="px-5 py-4 border-b border-dota-border">
            <h3 className="font-cinzel text-lg font-bold text-dota-gold">Auction House Insights</h3>
            <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
              Auction patterns across all games
            </p>
          </div>

          <div className="p-4 space-y-5">

            {/* Aggregate stats strip */}
            <div className="grid grid-cols-2 gap-3">
              <div className="panel-sunken p-3 text-center space-y-0.5">
                <p className="font-barlow text-[10px] font-semibold uppercase tracking-widest text-dota-text-muted">
                  Offers per game
                </p>
                <p className="font-cinzel text-xl font-bold text-dota-gold tabular-nums">
                  {auctionInsights.totalOffersPerGame}
                </p>
              </div>
              <div className="panel-sunken p-3 text-center space-y-0.5">
                <p className="font-barlow text-[10px] font-semibold uppercase tracking-widest text-dota-text-muted">
                  Sold-through rate
                </p>
                <p className="font-cinzel text-xl font-bold text-dota-radiant-light tabular-nums">
                  {auctionInsights.overallSoldThroughRate}
                </p>
              </div>
            </div>

            {/* Most Targeted */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Target className="w-3.5 h-3.5 text-dota-dire-light" aria-hidden="true" />
                <p className="stat-label">Most targeted</p>
                <p className="font-barlow text-[10px] text-dota-text-dim normal-case font-normal">
                  times put up for sale
                </p>
              </div>
              {auctionInsights.mostTargeted.length === 0 ? (
                <p className="font-barlow text-xs text-dota-text-dim pl-5">No auction data yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {auctionInsights.mostTargeted.map((entry, i) => (
                    <li key={entry.username} className="panel-sunken px-3 py-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-barlow text-xs font-bold w-5 text-center text-dota-text-dim shrink-0">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                        </span>
                        <span className="font-barlow font-semibold text-sm text-dota-text truncate">
                          {entry.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-barlow font-bold text-sm text-dota-dire-light tabular-nums">
                          {entry.value}
                        </span>
                        {entry.subValue && (
                          <span className="font-barlow text-[10px] text-dota-text-dim tabular-nums">
                            {entry.subValue}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Best Sellers */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Repeat2 className="w-3.5 h-3.5 text-dota-radiant-light" aria-hidden="true" />
                <p className="stat-label">Best sellers</p>
                <p className="font-barlow text-[10px] text-dota-text-dim normal-case font-normal">
                  offer acceptance rate · min. 2 offers
                </p>
              </div>
              {auctionInsights.bestSellers.length === 0 ? (
                <p className="font-barlow text-xs text-dota-text-dim pl-5">No auction data yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {auctionInsights.bestSellers.map((entry, i) => (
                    <li key={entry.username} className="panel-sunken px-3 py-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-barlow text-xs font-bold w-5 text-center text-dota-text-dim shrink-0">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                        </span>
                        <span className="font-barlow font-semibold text-sm text-dota-text truncate">
                          {entry.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-barlow font-bold text-sm text-dota-radiant-light tabular-nums">
                          {entry.value}
                        </span>
                        {entry.subValue && (
                          <span className="font-barlow text-[10px] text-dota-text-dim tabular-nums">
                            {entry.subValue}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </div>

        {/* ── Top Winning Combinations ─────────────────────────────────────── */}
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

      </div>{/* end bottom row */}

    </div>
  );
}
