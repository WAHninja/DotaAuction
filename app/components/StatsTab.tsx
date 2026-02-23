'use client'

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, TrendingUp, TrendingDown, Minus } from 'lucide-react'

import type { PlayerStats, TeamCombo, SortKey } from '@/types';

/* =============================================================================
   Helpers
============================================================================= */

function pct(success: number, total: number) {
  return total > 0 ? +(success / total * 100).toFixed(1) : 0;
}

function formatGold(value: number) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

// Returns Tailwind classes for a win-rate badge using dota token colours.
function pctColour(value: number): string {
  if (value >= 60) return 'text-dota-radiant-light bg-dota-radiant/10 border-dota-radiant/30';
  if (value >= 40) return 'text-dota-gold       bg-dota-gold/10       border-dota-gold/30';
  return                  'text-dota-dire-light  bg-dota-dire/10       border-dota-dire/30';
}

function PctBadge({ success, total }: { success: number; total: number }) {
  const rate = pct(success, total);
  if (total === 0) return <span className="text-dota-text-dim text-xs">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-barlow text-xs font-semibold ${pctColour(rate)}`}
      title={`${success} / ${total}`}
    >
      {rate}%
      <span className="text-[10px] opacity-50 font-normal">{success}/{total}</span>
    </span>
  );
}

function GoldValue({ value }: { value: number }) {
  const colour =
    value > 0 ? 'text-dota-radiant-light' :
    value < 0 ? 'text-dota-dire-light'    :
                'text-dota-text-muted';
  return (
    <span className={`flex items-center justify-center gap-1 font-barlow font-semibold tabular-nums ${colour}`}>
      {value > 0 ? <TrendingUp   className="w-3 h-3" /> :
       value < 0 ? <TrendingDown className="w-3 h-3" /> :
                   <Minus        className="w-3 h-3" />}
      {value > 0 ? '+' : ''}{formatGold(value)}
      <Image src="/Gold_symbol.webp" alt="Gold" width={13} height={13} className="inline-block" />
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return dir === 'desc'
    ? <ChevronDown className="w-3 h-3 text-dota-gold" />
    : <ChevronUp   className="w-3 h-3 text-dota-gold" />;
}

/* =============================================================================
   Component
============================================================================= */

export default function StatsTab() {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [combos, setCombos] = useState<TeamCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('gamesWinRate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'username' ? 'asc' : 'desc');
    }
  };

  const enrichedPlayers = useMemo(() => players.map(p => ({
    ...p,
    gamesWinRate:    pct(p.gamesWon, p.gamesPlayed),
    offerAcceptRate: pct(p.offersAccepted, p.offersMade),
  })), [players]);

  const sortedPlayers = useMemo(() => {
    return [...enrichedPlayers].sort((a: any, b: any) => {
      const aVal = a[sortKey], bVal = b[sortKey];
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [enrichedPlayers, sortKey, sortDir]);

  const topCombos = useMemo(() => combos.slice(0, 5), [combos]);

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

  const columns: { label: string; sublabel?: string; key: SortKey; tooltip: string }[] = [
    { label: 'Win Rate',       sublabel: 'games',            key: 'gamesWinRate',      tooltip: 'Games won out of games played' },
    { label: 'Offer Hit Rate', sublabel: 'as buyer',         key: 'offerAcceptRate',   tooltip: 'How often the offers you submit get accepted by the losing team' },
    { label: 'Market Value',   sublabel: 'avg bid received', key: 'averageOfferValue', tooltip: "Average gold offered for you — how much opponents think you're worth" },
    { label: 'Times Traded',   sublabel: 'sold',             key: 'timesSold',         tooltip: "How many times you've been transferred via the auction" },
    { label: 'Net Gold',       sublabel: 'all time',         key: 'netGold',           tooltip: 'Total gold earned minus losses across all games' },
  ];

  return (
    <div className="space-y-8">

      {/* ── Player Leaderboard ───────────────────────────────────────────────── */}
      <div className="panel overflow-hidden">

        <div className="px-5 py-4 border-b border-dota-border flex items-baseline justify-between">
          <div>
            <h3 className="font-cinzel text-lg font-bold text-dota-gold">Player Leaderboard</h3>
            <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
              Click any column to sort · Hover for descriptions
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full font-barlow text-sm text-dota-text">
            <thead>
              <tr className="bg-dota-deep border-b border-dota-border">

                {/* Rank */}
                <th className="px-3 py-3 w-10 text-dota-text-dim font-medium text-xs text-center">#</th>

                {/* Player */}
                <th
                  className="px-3 py-3 text-left text-dota-text-muted font-semibold cursor-pointer hover:text-dota-text transition-colors select-none"
                  onClick={() => handleSort('username')}
                >
                  <span className="flex items-center gap-1">
                    Player
                    <SortIcon active={sortKey === 'username'} dir={sortDir} />
                  </span>
                </th>

                {/* Stat columns */}
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`px-3 py-3 text-center cursor-pointer select-none transition-colors whitespace-nowrap font-semibold ${
                      sortKey === col.key
                        ? 'text-dota-gold'
                        : 'text-dota-text-muted hover:text-dota-text'
                    }`}
                    title={col.tooltip}
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="flex flex-col items-center gap-0.5">
                      <span className="flex items-center gap-1">
                        {col.label}
                        <SortIcon active={sortKey === col.key} dir={sortDir} />
                      </span>
                      {col.sublabel && (
                        <span className="text-[10px] font-normal opacity-40 tracking-normal normal-case">
                          {col.sublabel}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {sortedPlayers.map((p, i) => (
                <tr
                  key={p.username}
                  className={`border-b border-dota-border/50 transition-colors ${
                    i === 0
                      ? 'bg-dota-gold/5 hover:bg-dota-gold/8'
                      : 'hover:bg-dota-overlay/40'
                  }`}
                >
                  {/* Rank */}
                  <td className="px-3 py-3 text-center text-xs font-bold">
                    <span className={
                      i === 0 ? 'text-dota-gold' :
                      i === 1 ? 'text-dota-text-muted' :
                      i === 2 ? 'text-amber-600' :
                                'text-dota-text-dim'
                    }>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="px-3 py-3">
                    <span className={`font-semibold ${i === 0 ? 'text-dota-gold' : 'text-dota-text'}`}>
                      {p.username}
                    </span>
                    {p.gamesPlayed > 0 && (
                      <span className="ml-2 text-[10px] text-dota-text-dim">{p.gamesPlayed}g</span>
                    )}
                  </td>

                  {/* Win Rate */}
                  <td className="px-3 py-3 text-center">
                    <PctBadge success={p.gamesWon} total={p.gamesPlayed} />
                  </td>

                  {/* Offer Hit Rate */}
                  <td className="px-3 py-3 text-center">
                    <PctBadge success={p.offersAccepted} total={p.offersMade} />
                  </td>

                  {/* Market Value */}
                  <td className="px-3 py-3 text-center">
                    {p.timesOffered > 0 ? (
                      <span className="inline-flex items-center justify-center gap-1 text-dota-gold font-semibold tabular-nums">
                        {p.averageOfferValue.toFixed(0)}
                        <Image src="/Gold_symbol.webp" alt="Gold" width={13} height={13} className="inline-block" />
                        <span className="text-[10px] text-dota-text-dim font-normal">×{p.timesOffered}</span>
                      </span>
                    ) : (
                      <span className="text-dota-text-dim text-xs">—</span>
                    )}
                  </td>

                  {/* Times Traded */}
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

              {sortedPlayers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-dota-text-dim">
                    No player data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-2.5 border-t border-dota-border">
          <p className="font-barlow text-[11px] text-dota-text-dim">
            Market Value shows avg bid × times offered. Net Gold is the sum of all win rewards, loss penalties, and auction payouts.
          </p>
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
          {topCombos.length === 0 ? (
            <p className="text-center font-barlow text-dota-text-dim py-6">No completed games yet.</p>
          ) : (
            <ul className="space-y-3">
              {topCombos.map((c, i) => {
                const barPct = (c.wins / topCombos[0].wins) * 100;
                return (
                  <li key={c.combo} className="panel-sunken p-3">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-barlow text-sm font-bold w-6 text-center">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </span>
                      <span className="truncate font-barlow font-semibold text-sm text-dota-text">
                        {c.combo}
                      </span>
                      <span className="ml-auto font-barlow font-bold text-sm text-dota-radiant-light whitespace-nowrap">
                        {c.wins} {c.wins === 1 ? 'win' : 'wins'}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-dota-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barPct}%`,
                          background: 'linear-gradient(to right, #c8a951, #4a9b3c)',
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

    </div>
  );
}
