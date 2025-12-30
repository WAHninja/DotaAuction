'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load stats');
        }

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

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
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
  }, [players, sortKey, sortDir]);

  const topCombos = useMemo(() => {
    return [...topWinningCombos]
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10);
  }, [topWinningCombos]);

  const yAxisWidth = useMemo(() => {
    if (!topCombos.length) return 140;

    return Math.min(
      420,
      Math.max(...topCombos.map((c) => c.combo.length * 8)) + 20
    );
  }, [topCombos]);

  /* =======================
     Handlers
  ======================= */

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
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
      <div className="overflow-x-auto bg-slate-700/60 p-4 rounded-xl border border-slate-600 shadow-xl">
        <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">
          Player Stats
        </h3>

        {sortedPlayers.length === 0 ? (
          <p className="text-center text-gray-400 py-6">
            No player statistics available yet.
          </p>
        ) : (
          <table className="min-w-full text-sm text-left text-white">
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
              {sortedPlayers.map((p) => (
                <tr
                  key={p.username}
                  className="border-b border-slate-600 hover:bg-slate-700/40"
                >
                  <td className="px-3 py-2 font-semibold">{p.username}</td>
                  <td className="px-3 py-2">{p.matches}</td>
                  <td className="px-3 py-2">
                    {formatStat(p.gamesWon, p.gamesPlayed)}
                  </td>
                  <td className="px-3 py-2">
                    {formatStat(p.offersAccepted, p.offersMade)}
                  </td>
                  <td className="px-3 py-2">
                    {formatStat(p.timesSold, p.gamesPlayed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* =======================
          Top Team Combos Chart
      ======================= */}
      <div className="bg-slate-700/60 p-4 rounded-xl border border-slate-600 shadow-xl">
        <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">
          Top Winning Team Combinations
        </h3>

        {topCombos.length === 0 ? (
          <p className="text-center text-gray-400 py-10">
            No team combination data available yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={topCombos}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: '#fff' }}
                allowDecimals={false}
              />
              <YAxis
                dataKey="combo"
                type="category"
                width={yAxisWidth}
                interval={0}
                tick={{ fontSize: 12, fill: '#fff' }}
              />
              <Tooltip
                formatter={(v: number) => [`${v} wins`, 'Wins']}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar
                dataKey="wins"
                fill="#facc15"
                radius={[4, 4, 4, 4]}
                label={{ position: 'right', fill: '#fff', fontSize: 12 }}
              />
            </BarChart>
          </ResponsiveContainer>
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
      aria-sort={
        active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
      }
    >
      {label}
      {active && <span className="ml-1">{direction === 'asc' ? '▲' : '▼'}</span>}
    </th>
  );
}
