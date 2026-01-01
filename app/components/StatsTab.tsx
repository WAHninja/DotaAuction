'use client';

import { useEffect, useMemo, useState } from 'react';

/* =======================
   Types
======================= */

type PlayerStats = {
  username: string;
  matches: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesWinRate: number;
  offersMade: number;
  offersAccepted: number;
  offersAcceptedRate: number;
  timesSold: number;
  timesOffered: number; // ✅ NEW
  timesSoldRate: number;
};

type TeamCombo = {
  combo: string;
  wins: number;
};

type SortKey =
  | 'username'
  | 'matches'
  | 'gamesWinRate'
  | 'offersAcceptedRate'
  | 'timesSoldRate';

/* =======================
   Helpers
======================= */

function formatStat(success: number, total: number) {
  if (!total) return '0 / 0 (0%)';
  const pct = ((success / total) * 100).toFixed(1);
  return `${success} / ${total} (${pct}%)`;
}

/* =======================
   Component
======================= */

export default function StatsTab() {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [topWinningCombos, setTopWinningCombos] = useState<TeamCombo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('gamesWinRate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  /* =======================
     Data Fetch
  ======================= */

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to load stats');

        setPlayers(data.players ?? []);
        setTopWinningCombos(data.topWinningCombos ?? []);
      } catch (err) {
        console.error(err);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  /* =======================
     Derived Data
  ======================= */

  const filteredPlayers = useMemo(
    () => players.filter(p => !p.username.toLowerCase().startsWith('ztest')),
    [players]
  );

  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (typeof aVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }

      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [filteredPlayers, sortKey, sortDir]);

  const filteredTopCombos = useMemo(() => {
    return topWinningCombos.filter(
      combo =>
        !combo.combo
          .split(',')
          .some(name => name.trim().toLowerCase().startsWith('ztest'))
    );
  }, [topWinningCombos]);

  const topCombos = useMemo(() => {
    return [...filteredTopCombos]
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 5);
  }, [filteredTopCombos]);

  /* =======================
     UI States
  ======================= */

  if (loading) {
    return (
      <div className="bg-slate-700/60 p-6 rounded-xl border border-slate-600 shadow-xl text-center text-gray-300">
        Loading statistics…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-700/60 p-6 rounded-xl border border-slate-600 shadow-xl text-center text-red-400">
        {error}
      </div>
    );
  }

  /* =======================
     Render
  ======================= */

  return (
    <div className="space-y-10">
      <div className="bg-slate-700/60 p-4 rounded-xl border border-slate-600 shadow-xl overflow-x-auto">
        <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">
          Player Stats
        </h3>

        <table className="min-w-full text-sm sm:text-base text-left text-white">
          <thead>
            <tr className="bg-slate-800/80">
              <SortableHeader label="Player" active={sortKey === 'username'} direction={sortDir} onClick={() => setSortKey('username')} />
              <SortableHeader label="Matches" active={sortKey === 'matches'} direction={sortDir} onClick={() => setSortKey('matches')} />
              <SortableHeader label="Game Win Rate" active={sortKey === 'gamesWinRate'} direction={sortDir} onClick={() => setSortKey('gamesWinRate')} />
              <SortableHeader label="Offers Accepted" active={sortKey === 'offersAcceptedRate'} direction={sortDir} onClick={() => setSortKey('offersAcceptedRate')} />
              <SortableHeader label="Sale Success" active={sortKey === 'timesSoldRate'} direction={sortDir} onClick={() => setSortKey('timesSoldRate')} />
            </tr>
          </thead>

          <tbody>
            {sortedPlayers.map(p => (
              <tr key={p.username} className="border-b border-slate-600 hover:bg-slate-700/40">
                <td className="px-3 py-2 font-semibold">{p.username}</td>
                <td className="px-3 py-2 text-center">{p.matches}</td>
                <td className="px-3 py-2 text-center">
                  {formatStat(p.gamesWon, p.gamesPlayed)}
                </td>
                <td className="px-3 py-2 text-center">
                  {formatStat(p.offersAccepted, p.offersMade)}
                </td>
                <td className="px-3 py-2 text-center">
                  {formatStat(p.timesSold, p.timesOffered)} {/* ✅ FIXED */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* =======================Top 5 Winning Team Combinations======================= */}
      <div className="bg-slate-700/60 p-4 rounded-xl border border-slate-600 shadow-xl">
        <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">
          Top 5 Winning Team Combinations
        </h3>

        {topCombos.length === 0 ? (
          <p className="text-center text-gray-400 py-6">
            No team combination data available yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {topCombos.map((combo, idx) => {
              const maxWins = topCombos[0].wins
              const widthPct = (combo.wins / maxWins) * 100

              return (
                <li
                  key={combo.combo}
                  className="bg-slate-800/80 p-3 rounded-md hover:bg-slate-700/60 transition"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-yellow-400 font-bold text-lg">
                      {idx + 1}.
                    </span>

                    <span
                      className="font-semibold text-white truncate"
                      title={combo.combo}
                    >
                      {combo.combo}
                    </span>

                    <span className="ml-auto text-green-300 font-bold">
                      {combo.wins} win{combo.wins !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-3 bg-slate-600 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-lime-400 transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>      
    </div>
  );
}

/* =======================
   Sub Components
======================= */

function SortableHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onClick: () => void;
}) {
  return (
    <th
      onClick={onClick}
      className="px-3 py-2 cursor-pointer select-none hover:text-orange-400"
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      {active && <span className="ml-1">{direction === 'asc' ? '▲' : '▼'}</span>}
    </th>
  );
}
