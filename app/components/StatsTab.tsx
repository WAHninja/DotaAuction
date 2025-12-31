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
  timesSoldRate: number;
};

type TeamCombo = {
  combo: string; // comma separated usernames
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

  // Filter out any players starting with "ztest"
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

  // Filter top combos to remove any that include a ztest player
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
     Handlers
  ======================= */

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

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
      {/* =======================
          Player Stats Table
      ======================= */}
      <div className="bg-slate-700/60 p-4 rounded-xl border border-slate-600 shadow-xl overflow-x-auto">
        <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">
          Player Stats
        </h3>

        {sortedPlayers.length === 0 ? (
          <p className="text-center text-gray-400 py-6">
            No player statistics available yet.
          </p>
        ) : (
          <table className="min-w-full text-sm sm:text-base text-left text-white">
            <thead>
              <tr className="bg-slate-800/80">
                <SortableHeader
                  label="Player"
                  active={sortKey === 'username'}
                  direction={sortDir}
                  onClick={() => toggleSort('username')}
                />
                <SortableHeader
                  label="Matches"
                  active={sortKey === 'matches'}
                  direction={sortDir}
                  onClick={() => toggleSort('matches')}
                />
                <SortableHeader
                  label="Game Win Rate"
                  active={sortKey === 'gamesWinRate'}
                  direction={sortDir}
                  onClick={() => toggleSort('gamesWinRate')}
                />
                <SortableHeader
                  label="Offers Accepted"
                  active={sortKey === 'offersAcceptedRate'}
                  direction={sortDir}
                  onClick={() => toggleSort('offersAcceptedRate')}
                />
                <SortableHeader
                  label="Times Sold"
                  active={sortKey === 'timesSoldRate'}
                  direction={sortDir}
                  onClick={() => toggleSort('timesSoldRate')}
                />
              </tr>
            </thead>

            <tbody>
              {sortedPlayers.map(p => (
                <tr
                  key={p.username}
                  className="border-b border-slate-600 hover:bg-slate-700/40"
                >
                  <td className="px-2 py-2 sm:px-3 sm:py-2 font-semibold">{p.username}</td>
                  <td className="px-2 py-2 sm:px-3 sm:py-2">{p.matches}</td>
                  <td className="px-2 py-2 sm:px-3 sm:py-2">
                    {formatStat(p.gamesWon, p.gamesPlayed)}
                  </td>
                  <td className="px-2 py-2 sm:px-3 sm:py-2">
                    {formatStat(p.offersAccepted, p.offersMade)}
                  </td>
                  <td className="px-2 py-2 sm:px-3 sm:py-2">
                    {formatStat(p.timesSold, p.gamesPlayed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* =======================
          Top 5 Team Combinations
      ======================= */}
      <div className="bg-slate-700/60 p-4 rounded-xl border border-slate-600 shadow-xl">
        <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">
          Top 5 Winning Team Combinations
        </h3>

        {topCombos.length === 0 ? (
          <p className="text-center text-gray-400 py-10">
            No team combination data available yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {topCombos.map((combo, idx) => {
              const greenValue = 120 + Math.round((combo.wins / topCombos[0].wins) * 80);
              const barColor = `rgb(0, ${greenValue}, 0)`;

              return (
                <li
                  key={combo.combo}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-800/80 p-3 rounded-md hover:bg-slate-700/50 transition"
                >
                  {/* Rank + Name */}
                  <div className="flex items-center gap-2 flex-shrink-0 w-max min-w-[200px] sm:min-w-[250px]">
                    <span className="font-semibold text-yellow-400 text-base sm:text-lg">{idx + 1}.</span>
                    <span
                      className="truncate text-white text-sm sm:text-base"
                      title={combo.combo}
                    >
                      {combo.combo}
                    </span>
                  </div>

                  {/* Uniform Bar */}
                  <div className="relative flex-1 h-4 bg-slate-600 rounded-md overflow-hidden mt-2 sm:mt-0">
                    <div
                      className="h-full rounded-md transition-all duration-500"
                      style={{
                        width: '100%',
                        background: `linear-gradient(to right, ${barColor}, limegreen)`,
                      }}
                    />
                  </div>

                  {/* Wins */}
                  <span className="mt-1 sm:mt-0 sm:ml-4 font-bold text-green-300 text-sm sm:text-base flex-shrink-0">
                    {combo.wins} win{combo.wins > 1 ? 's' : ''}
                  </span>
                </li>
              );
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
      className="px-2 sm:px-3 py-2 cursor-pointer select-none hover:text-orange-400"
      aria-sort={
        active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
      }
    >
      {label}
      {active && <span className="ml-1">{direction === 'asc' ? '▲' : '▼'}</span>}
    </th>
  );
}
