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
  | 'gamesPlayed'
  | 'gamesWinRate'
  | 'offersAcceptedRate'
  | 'timesSoldRate';

export default function StatsTab() {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [topWinningCombos, setTopWinningCombos] = useState<TeamCombo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('gamesWinRate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to load stats');
          return;
        }

        setPlayers(data.players);
        setTopWinningCombos(data.topWinningCombos);
      } catch (err) {
        console.error(err);
        setError('Unexpected error loading stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  if (loading) {
    return <p className="text-center text-gray-400">Loading stats…</p>;
  }

  if (error) {
    return <p className="text-center text-red-400">{error}</p>;
  }

  return (
    <div className="space-y-10">
      {/* ================= PLAYER STATS TABLE ================= */}
      <div className="overflow-x-auto bg-slate-700/60 p-5 rounded-xl border border-slate-600 shadow-xl">
        <h3 className="text-xl font-bold text-yellow-400 mb-4 text-center">
          Player Statistics
        </h3>

        <table className="min-w-full text-sm text-white">
          <thead>
            <tr className="bg-slate-800/80">
              <Header label="Player" onClick={() => toggleSort('username')} />
              <Header label="Matches" onClick={() => toggleSort('matches')} />
              <Header label="Games" onClick={() => toggleSort('gamesPlayed')} />
              <Header
                label="Games Won"
                onClick={() => toggleSort('gamesWinRate')}
              />
              <Header
                label="Offers Accepted"
                onClick={() => toggleSort('offersAcceptedRate')}
              />
              <Header
                label="Times Sold"
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
                <td className="px-3 py-2">{p.gamesPlayed}</td>

                <td className="px-3 py-2">
                  {p.gamesWon} ({p.gamesWinRate.toFixed(1)}%)
                </td>

                <td className="px-3 py-2">
                  {p.offersAccepted} / {p.offersMade}{' '}
                  <span className="text-gray-300">
                    ({p.offersAcceptedRate.toFixed(1)}%)
                  </span>
                </td>

                <td className="px-3 py-2">
                  {p.timesSold}{' '}
                  <span className="text-gray-300">
                    ({p.timesSoldRate.toFixed(1)}%)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= TOP TEAM COMBOS ================= */}
      <div className="bg-slate-700/60 p-5 rounded-xl border border-slate-600 shadow-xl">
        <h3 className="text-xl font-bold text-yellow-400 mb-4 text-center">
          Top Winning Team Combinations
        </h3>

        <ResponsiveContainer width="100%" height={360}>
          <BarChart
            data={topWinningCombos.slice(0, 8)}
            layout="vertical"
            margin={{ top: 10, right: 40, left: 180, bottom: 10 }}
          >
            <XAxis type="number" tick={{ fill: '#fff' }} />
            <YAxis
              dataKey="combo"
              type="category"
              width={260}
              tick={<TeamComboTick />}
            />
            <Tooltip
              formatter={(value: number) => [`${value} wins`, 'Wins']}
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                color: '#fff',
              }}
            />
            <Bar
              dataKey="wins"
              fill="#f97316"
              label={{ position: 'right', fill: '#fff', fontSize: 12 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function Header({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <th
      onClick={onClick}
      className="px-3 py-2 cursor-pointer select-none hover:text-orange-400"
    >
      {label}
    </th>
  );
}

const TeamComboTick = ({ x, y, payload }: any) => {
  const players = payload.value.split(' + ');

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        textAnchor="end"
        fill="#fff"
        fontSize={12}
        dy={-((players.length - 1) * 7)}
      >
        {players.map((p: string, i: number) => (
          <tspan key={i} x={0} dy={i === 0 ? 0 : 14}>
            {p}
          </tspan>
        ))}
      </text>
    </g>
  );
};
