'use client'

import Image from 'next/image';
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  ArrowUp, ArrowDown, Minus,
  Zap, Swords, ShoppingCart, ChevronDown as SelectChevron,
} from 'lucide-react'
import type { PlayerStats, TeamCombo, AcquisitionImpact, WinStreak, HeadToHead } from '@/types';

// =============================================================================
// Constants
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
  /** Tooltip anchor. 'right' for the last column to prevent overflow. */
  tooltipAlign?: 'center' | 'right';
};

const COLUMNS: Column[] = [
  {
    label: 'Win Rate',
    sublabel: `min. ${MIN_GAMES_FOR_RATE} games`,
    key: 'gamesWinRate',
    tooltip: `Percentage of games won.`,
  },
  {
    label: 'Offers Accepted',
    sublabel: 'as seller',
    key: 'offerAcceptRate',
    tooltip: 'How often offers you submitted were accepted by the opponent team.',
  },
  {
    label: 'Avg Bid',
    sublabel: 'when targeted',
    key: 'averageOfferValue',
    tooltip: 'Average gold your own teammates offered when putting you up for sale.',
  },
  {
    label: 'Targeted',
    sublabel: 'times offered',
    key: 'timesOffered',
    tooltip: 'How many times a teammate has put you up for sale in an auction.',
  },
  {
    label: 'Sold',
    sublabel: 'times transferred',
    key: 'timesSold',
    tooltip: 'How many times you have been sold.',
  },
  {
    label: 'Net Gold',
    sublabel: 'all time',
    key: 'netGold',
    tooltip: 'Sum of all win rewards and auction payouts, minus all loss penalties, across every game played.',
    tooltipAlign: 'right',
  },
];

const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

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
// Shared sub-components
// =============================================================================

// ── Tooltip ───────────────────────────────────────────────────────────────────
// Direction: top-full (downward into the table body).
//
// overflow-x-auto creates a scroll container. CSS cannot mix overflow: auto on
// one axis with overflow: visible on the other — the browser promotes visible
// to auto, clipping any absolutely-positioned child that escapes upward.
// Pointing downward keeps the tooltip within the scroll container's bounds.
//
// align='center' (default) — centres the bubble on the trigger.
// align='right'            — anchors the bubble to the right edge of the trigger.
//   Used for the last table column (Net Gold) so the tooltip doesn't extend
//   beyond the right edge of the table and widen the scroll container.
function Tooltip({ id, content, children, align = 'center' }: {
  id: string;
  content: string;
  children: ReactNode;
  align?: 'center' | 'right';
}) {
  const bubblePos  = align === 'right'
    ? 'right-0'
    : 'left-1/2 -translate-x-1/2';
  const arrowPos   = align === 'right'
    ? 'right-4'
    : 'left-1/2 -translate-x-1/2';

  return (
    <div className="relative group inline-flex justify-center">
      {children}
      <div
        id={id}
        role="tooltip"
        className={`
          pointer-events-none
          absolute top-full mt-2 z-20 ${bubblePos}
          w-56 px-3 py-2 rounded
          bg-dota-raised border border-dota-border-bright
          font-barlow text-xs text-dota-text-muted leading-snug
          opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
          transition-opacity duration-150
          text-left whitespace-normal
        `}
      >
        {/* Arrow points up toward the trigger */}
        <span
          aria-hidden="true"
          className={`absolute bottom-full ${arrowPos} border-4 border-transparent border-b-dota-border-bright`}
        />
        {content}
      </div>
    </div>
  );
}

// ── PctBadge ──────────────────────────────────────────────────────────────────
function PctBadge({ success, total, minGames = 0 }: {
  success: number; total: number; minGames?: number;
}) {
  if (total === 0) return <span className="text-dota-text-dim text-xs">—</span>;
  if (total < minGames) {
    return (
      <span className="text-dota-text-dim text-xs" title={`Need ${minGames} games (has ${total})`}>—</span>
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

// ── RankedList ────────────────────────────────────────────────────────────────
// Reusable ranked list used by both Acquisition Impact and Win Streaks.
// Each row: rank emoji | name | primary value | optional sub-value
function RankedList({ items, emptyMessage }: {
  items: { name: string; primary: string; sub?: string }[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="font-barlow text-xs text-dota-text-dim py-4 text-center">{emptyMessage}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={`${item.name}-${i}`} className="panel-sunken px-3 py-2.5 flex items-center gap-3">
          <span className="shrink-0 w-5 text-center text-sm" aria-hidden="true">
            {RANK_EMOJIS[i] ?? `${i + 1}.`}
          </span>
          <span className="font-barlow font-semibold text-sm text-dota-text truncate flex-1 min-w-0">
            {item.name}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-barlow font-bold text-sm text-dota-gold tabular-nums">
              {item.primary}
            </span>
            {item.sub && (
              <span className="font-barlow text-[10px] text-dota-text-dim tabular-nums">
                {item.sub}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── CardHeader ────────────────────────────────────────────────────────────────
function CardHeader({ icon: Icon, iconClass, title, subtitle }: {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3">
      <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} aria-hidden="true" />
      <div>
        <h3 className="font-cinzel text-lg font-bold text-dota-gold">{title}</h3>
        <p className="font-barlow text-xs text-dota-text-muted mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

// =============================================================================
// Types
// =============================================================================

type EnrichedPlayer = PlayerStats & {
  gamesWinRate: number;
  offerAcceptRate: number;
};

type StatsTabProps = Record<string, never>;

// =============================================================================
// StatsTab
// =============================================================================

export default function StatsTab(_props: StatsTabProps) {
  const [players, setPlayers]               = useState<PlayerStats[]>([]);
  const [combos, setCombos]                 = useState<TeamCombo[]>([]);
  const [acquisitionImpact, setAcquisition] = useState<AcquisitionImpact[]>([]);
  const [winStreaks, setWinStreaks]          = useState<WinStreak[]>([]);
  const [headToHead, setHeadToHead]         = useState<HeadToHead[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [sortKey, setSortKey]               = useState<LocalSortKey>('gamesWinRate');
  const [sortDir, setSortDir]               = useState<'asc' | 'desc'>('desc');
  const [showAllCombos, setShowAllCombos]   = useState(false);
  // Head-to-head player selector — defaults to the signed-in user once /api/me resolves
  const [h2hSelected, setH2hSelected] = useState<string>('');

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/me').then(r => r.json()),
    ])
      .then(([statsData, meData]) => {
        setPlayers(statsData.players ?? []);
        setCombos(statsData.topWinningCombos ?? []);
        setAcquisition(statsData.acquisitionImpact ?? []);
        setWinStreaks(statsData.winStreaks ?? []);
        setHeadToHead(statsData.headToHead ?? []);
        // Pre-select the signed-in user in the H2H picker if they exist in the data
        if (meData.username) {
          setH2hSelected(meData.username);
        }
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load statistics');
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Sort helpers ────────────────────────────────────────────────────────────
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
      gamesWinRate:    p.gamesPlayed >= MIN_GAMES_FOR_RATE ? pct(p.gamesWon, p.gamesPlayed) : -1,
      offerAcceptRate: pct(p.offersAccepted, p.offersMade),
    })),
    [players]
  );

  const sortedPlayers = useMemo<EnrichedPlayer[]>(() =>
    [...enrichedPlayers].sort((a, b) => {
      const aVal = a[sortKey as keyof EnrichedPlayer];
      const bVal = b[sortKey as keyof EnrichedPlayer];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    }),
    [enrichedPlayers, sortKey, sortDir]
  );

  const showMedals    = sortKey === 'gamesWinRate' && sortDir === 'desc';
  const visibleCombos = showAllCombos ? combos : combos.slice(0, 5);

  // ── Head-to-Head derived data ───────────────────────────────────────────────
  // Collect all unique player names that appear in the H2H data, sorted alpha.
  const h2hPlayers = useMemo<string[]>(() => {
    const names = new Set<string>();
    headToHead.forEach(r => { names.add(r.playerA); names.add(r.playerB); });
    return [...names].sort();
  }, [headToHead]);

  // For the selected player, build their record against each opponent they've
  // faced, normalised from their perspective regardless of canonical ordering.
  type H2HRow = {
    opponent: string;
    wins: number;
    losses: number;
    totalGames: number;
    winRate: number;
  };

  const h2hRows = useMemo<H2HRow[]>(() => {
    if (!h2hSelected) return [];

    return headToHead
      .filter(r => r.playerA === h2hSelected || r.playerB === h2hSelected)
      .map(r => {
        const isA     = r.playerA === h2hSelected;
        const wins    = isA ? r.playerAWins : r.playerBWins;
        const losses  = isA ? r.playerBWins : r.playerAWins;
        const opponent = isA ? r.playerB : r.playerA;
        return {
          opponent,
          wins,
          losses,
          totalGames: r.totalGames,
          winRate: pct(wins, r.totalGames),
        };
      })
      // Most-played rivalries first, then win rate as tiebreak
      .sort((a, b) => b.totalGames - a.totalGames || b.winRate - a.winRate);
  }, [headToHead, h2hSelected]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="panel p-8 text-center font-barlow text-dota-text-muted">
        Loading statistics…
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel p-8 text-center font-barlow text-dota-dire-light">
        {error}
      </div>
    );
  }

  if (sortedPlayers.length === 0) {
    return (
      <div className="panel p-12 text-center font-barlow text-dota-text-dim">
        No player data yet — complete a game to see stats.
      </div>
    );
  }

  return (

      {/* ── Player Leaderboard ─────────────────────────────────────────────── */}
      <div className="panel overflow-hidden">
        <div className="px-5 py-4 border-b border-dota-border">
          <h3 className="font-cinzel text-lg font-bold text-dota-gold">Player Leaderboard</h3>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            Click any column to sort · Medals shown for win rate ranking only
          </p>
        </div>

        {/* overflow-x-auto clips upward tooltips — see Tooltip comment above */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-dota-surface to-transparent z-10 lg:hidden"
          />
          <div className="overflow-x-auto">
            <table className="min-w-full font-barlow text-sm text-dota-text">
              <thead>
                <tr className="bg-dota-deep border-b border-dota-border">

                  <th scope="col" className="px-3 py-3 w-10 text-dota-text-dim font-medium text-xs text-center" aria-label="Rank">
                    #
                  </th>

                  <th
                    scope="col"
                    aria-sort={sortKey === 'username' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="px-3 py-3 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort('username')}
                      className="flex items-center gap-1 font-barlow font-semibold text-xs text-dota-text-muted hover:text-dota-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dota-gold focus-visible:ring-offset-1 focus-visible:ring-offset-dota-deep rounded"
                    >
                      Player
                      <SortIcon active={sortKey === 'username'} dir={sortDir} />
                    </button>
                  </th>

                  {COLUMNS.map(col => {
                    const tooltipId = `col-tooltip-${col.key}`;
                    const isActive  = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        className="px-3 py-3 text-center"
                      >
                        <Tooltip id={tooltipId} content={col.tooltip} align={col.tooltipAlign}>
                          <button
                            type="button"
                            onClick={() => handleSort(col.key)}
                            aria-describedby={tooltipId}
                            className={`flex flex-col items-center gap-0.5 mx-auto font-barlow font-semibold text-xs whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dota-gold focus-visible:ring-offset-1 focus-visible:ring-offset-dota-deep rounded ${isActive ? 'text-dota-gold' : 'text-dota-text-muted hover:text-dota-text'}`}
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
                    className={`border-b border-dota-border/50 transition-colors ${showMedals && i === 0 ? 'bg-dota-gold/5 hover:bg-dota-gold/8' : 'hover:bg-dota-overlay/40'}`}
                  >
                    <td className="px-3 py-3 text-center text-xs font-bold">
                      {showMedals
                        ? <span className={i === 0 ? 'text-dota-gold' : i === 1 ? 'text-dota-text-muted' : i === 2 ? 'text-amber-600' : 'text-dota-text-dim'}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </span>
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
                      <PctBadge success={p.gamesWon} total={p.gamesPlayed} minGames={MIN_GAMES_FOR_RATE} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <PctBadge success={p.offersAccepted} total={p.offersMade} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      {p.timesOffered > 0
                        ? <span className="inline-flex items-center justify-center gap-1 text-dota-gold font-semibold tabular-nums">
                            {p.averageOfferValue.toFixed(0)}
                            <Image src="/Gold_symbol.webp" alt="Gold" width={13} height={13} className="inline-block" />
                          </span>
                        : <span className="text-dota-text-dim text-xs">—</span>
                      }
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
        </div>
      </div>

      {/* ── Row 2: Acquisition Impact + Win Streaks ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Acquisition Impact ─────────────────────────────────────────────── */}
        <div className="panel overflow-hidden">
          <CardHeader
            icon={ShoppingCart}
            iconClass="text-dota-gold"
            title="Acquisition Impact"
            subtitle="Win rate of your new team the game after you're sold"
          />
          <div className="p-4">
            {/*
              This metric is genuinely novel: it measures whether you're a
              liability or an asset to the team that acquires you. A high rate
              means opponents tend to regret accepting you; a low rate means
              you consistently fail to help your new team win.

              Only players with ≥ 2 acquisitions are shown — one sale is
              too small a sample to draw any conclusion from.
            */}
            <RankedList
              emptyMessage="Need at least 2 sold players to show acquisition impact."
              items={acquisitionImpact.map(p => ({
                name:    p.username,
                primary: `${p.winRate}%`,
                sub:     `${p.winsAfterAcquisition}/${p.totalAcquisitions} games`,
              }))}
            />
            {acquisitionImpact.length > 0 && (
            )}
          </div>
        </div>

        {/* ── Win Streaks ─────────────────────────────────────────────────────── */}
        <div className="panel overflow-hidden">
          <CardHeader
            icon={Zap}
            iconClass="text-dota-radiant-light"
            title="Win Streaks"
            subtitle="Longest consecutive winning run within a single match"
          />
          <div className="p-4">
            {/*
              A win streak within a match is a different story to a high
              overall win rate — it captures dominance during a session.
              A player with 6 wins in a row held court for the whole back
              half of a match; that's more vivid than knowing they win 55%
              of games globally.

              matchId is shown as context so players can look up that match.
            */}
            <RankedList
              emptyMessage="No win streaks of 2+ games recorded yet."
              items={winStreaks.map(s => ({
                name:    s.username,
                primary: `${s.longestStreak} in a row`,
                sub:     `match #${s.matchId}`,
              }))}
            />
            {winStreaks.length > 0 && (
              <p className="font-barlow text-[10px] text-dota-text-dim mt-3 leading-snug">
                Longest run of consecutive wins within a single match.
                Each player's personal best shown regardless of how many
                matches they've played.
              </p>
            )}
          </div>
        </div>

      </div>

      {/* ── Row 3 + 4: Head-to-Head and Top Combinations side by side ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

      {/* ── Head-to-Head ─────────────────────────────────────────────────────── */}
      <div className="panel overflow-hidden">
        <CardHeader
          icon={Swords}
          iconClass="text-dota-dire-light"
          title="Head-to-Head"
          subtitle="Win rate against specific opponents across all games you've faced each other"
        />

        <div className="p-4 space-y-4">
          {headToHead.length === 0 ? (
            <p className="text-center font-barlow text-dota-text-dim py-6">
              No head-to-head data yet — need finished games with opposing players.
            </p>
          ) : (
            <>
              {/* Player selector */}
              <div className="relative max-w-xs">
                <select
                  value={h2hSelected}
                  onChange={e => setH2hSelected(e.target.value)}
                  aria-label="Select player to view their head-to-head record"
                  className="input appearance-none pr-8 cursor-pointer"
                >
                  <option value="">Select a player…</option>
                  {h2hPlayers.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                {/* Decorative chevron — the native select handles interaction */}
                <SelectChevron
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dota-text-muted"
                  aria-hidden="true"
                />
              </div>

              {/* Results */}
              {!h2hSelected ? (
                <p className="font-barlow text-sm text-dota-text-dim text-center py-4">
                  Choose a player above to see their record against each opponent.
                </p>
              ) : h2hRows.length === 0 ? (
                <p className="font-barlow text-sm text-dota-text-dim text-center py-4">
                  No recorded matchups for {h2hSelected} yet.
                </p>
              ) : (
                <div>
                  {/*
                    Table structure for the H2H results.
                    Columns: opponent | W | L | games | win rate badge
                    Sorted by total games desc so the most-played rivalries
                    surface first — these are the most statistically meaningful
                    and the most emotionally resonant for a regular playgroup.
                  */}
                  <table className="w-full font-barlow text-sm" aria-label={`Head-to-head record for ${h2hSelected}`}>
                    <thead>
                      <tr className="border-b border-dota-border text-left">
                        <th scope="col" className="pb-2 pr-4 font-semibold text-xs text-dota-text-muted uppercase tracking-widest">
                          Opponent
                        </th>
                        <th scope="col" className="pb-2 px-3 font-semibold text-xs text-dota-radiant-light uppercase tracking-widest text-center">
                          W
                        </th>
                        <th scope="col" className="pb-2 px-3 font-semibold text-xs text-dota-dire-light uppercase tracking-widest text-center">
                          L
                        </th>
                        <th scope="col" className="pb-2 px-3 font-semibold text-xs text-dota-text-muted uppercase tracking-widest text-center">
                          Games
                        </th>
                        <th scope="col" className="pb-2 pl-3 font-semibold text-xs text-dota-text-muted uppercase tracking-widest text-right">
                          Win Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dota-border/40">
                      {h2hRows.map(row => (
                        <tr key={row.opponent} className="hover:bg-dota-overlay/30 transition-colors">
                          <td className="py-2.5 pr-4 font-semibold text-dota-text">
                            {row.opponent}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold tabular-nums text-dota-radiant-light">
                            {row.wins}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold tabular-nums text-dota-dire-light">
                            {row.losses}
                          </td>
                          <td className="py-2.5 px-3 text-center tabular-nums text-dota-text-muted">
                            {row.totalGames}
                          </td>
                          <td className="py-2.5 pl-3 text-right">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-barlow text-xs font-semibold ${pctColour(row.winRate)}`}>
                              {row.winRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Top Winning Combinations ─────────────────────────────────────────── */}
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
                  <li key={c.combo} className="panel-sunken p-3 flex items-center gap-3">
                    <span className="font-barlow text-sm font-bold w-6 text-center shrink-0">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </span>
                    <span className="truncate font-barlow font-semibold text-sm text-dota-text flex-1 min-w-0">
                      {c.combo}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-barlow text-xs text-dota-text-dim tabular-nums whitespace-nowrap">
                        {c.wins}W – {c.gamesPlayed - c.wins}L
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border font-barlow text-xs font-semibold ${pctColour(c.winRate)}`}>
                        {c.winRate}%
                      </span>
                    </div>
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

      </div>{/* end H2H + Combos grid */}

    </div>
  );
}
