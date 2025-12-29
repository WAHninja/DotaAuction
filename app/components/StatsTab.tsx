'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
  | 'offersMade'
  | 'offersAcceptedRate'
  | 'timesSold'
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

        if (res.ok) {
          setPlayers(data.players);
          setTopWinningCombos(data.topWinningCombos);
        } else {
          setError(data.error || 'Failed to load stats');
        }
      } catch (err) {
        console.error(err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatStat = (success: number, total: number) => {
    if (!total) return '0 / 0 (0%)';
    const pct = ((success / total) * 100).toFixed(1);
    return `${success} / ${total} (${pct}%)`;
  };

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
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortHeader = ({
    label,
    sort,
  }: {
    label: string;
    sort: SortKey;
  }) => (
    <th
      onClick={() => toggleSort(sort)}
      className="px-3 py-2 cursor-pointer select-none hover:text-orange-400"
    >
      {label}
      {sortKey === sort && (
        <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>
      )}
    </th>
  );

  if (loading) return <p className="text-center text-gray-400">Loading stats...</p>;
  if (error) return <p className="text-center text-red-400">{error}</p>;

  return (
    <div className="space-y-8">
      {/* Player Stats Table */}
      <div className="overflow-x-auto bg-slate-700/60 p-4 rounded-xl border border-slate-600 shadow-xl">
        <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">
          Player Stats
        </h3>

        <table className="min-w-full text-sm text-left text-white">
          <thead>
            <tr className="bg-slate-800/80">
              <SortHeader label="Player" sort="username" />
              <SortHeader label="Matches" sort="matches" />
              <SortHeader label="Games Won" sort="gamesWinRate" />
              <SortHeader label="Offers Accepted" sort="offersAcceptedRate" />
              <SortHeader label="Times Sold" sort="timesSoldRate" />
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
      </div>

      {/* Top Winning Team Combinations */}
      <div className="bg-slate-700/60 p-4 rounded-xl border border-slate-600 shadow-xl">
        <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">
          Top Winning Team Combinations
        </h3>

        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={topWinningCombos
              .sort((a, b) => b.wins - a.wins)
              .slice(0, 10)}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 140, bottom: 20 }}
          >
            <XAxis 
              type="number" 
              tick={{ fontSize: 12, fill: '#fff' }} 
              allowDecimals={false} 
            />
            <YAxis
              dataKey="combo"
              type="category"
              tick={{ fontSize: 12, fill: '#fff' }}
              width={140}
              interval={0}
              tickFormatter={(name) =>
                name.length > 25 ? name.slice(0, 22) + '...' : name
              }
            />
            <Tooltip formatter={(v: any) => [`${v} wins`, 'Wins']} />
            <Bar 
              dataKey="wins" 
              fill="#facc15"
              radius={[4, 4, 4, 4]}
              label={{ position: 'right', fill: '#fff', fontSize: 12 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
