'use client';

import { useEffect, useState } from 'react';
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

export default function StatsTab() {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [topWinningCombos, setTopWinningCombos] = useState<TeamCombo[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <p className="text-center text-gray-400">Loading stats...</p>;
  if (error) return <p className="text-center text-red-400">{error}</p>;

  return (
    <div className="space-y-8">
      {/* Player Stats Table */}
      <div className="overflow-x-auto bg-slate-700/60 p-4 rounded-xl border border-slate-600 shadow-xl">
        <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">Player Stats</h3>
        <table className="min-w-full text-sm text-left text-white">
          <thead>
            <tr className="bg-slate-800/80">
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Matches</th>
              <th className="px-3 py-2">Games Played</th>
              <th className="px-3 py-2">% Games Won</th>
              <th className="px-3 py-2">Offers Made</th>
              <th className="px-3 py-2">% Offers Accepted</th>
              <th className="px-3 py-2">Times Sold</th>
              <th className="px-3 py-2">% Sold</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.username} className="border-b border-slate-600">
                <td className="px-3 py-2 font-semibold">{p.username}</td>
                <td className="px-3 py-2">{p.matches}</td>
                <td className="px-3 py-2">{p.gamesPlayed}</td>
                <td className="px-3 py-2">{p.gamesWinRate.toFixed(1)}%</td>
                <td className="px-3 py-2">{p.offersMade}</td>
                <td className="px-3 py-2">{p.offersAcceptedRate.toFixed(1)}%</td>
                <td className="px-3 py-2">{p.timesSold}</td>
                <td className="px-3 py-2">{p.timesSoldRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Winning Team Combinations Chart */}
      <div className="bg-slate-700/60 p-4 rounded-xl border border-slate-600 shadow-xl">
        <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">Top Winning Team Combinations</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={topWinningCombos}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
          >
            <XAxis type="number" />
            <YAxis dataKey="combo" type="category" tick={{ fontSize: 12, fill: '#fff' }} width={200} />
            <Tooltip formatter={(value: any) => [`${value} wins`, 'Wins']} />
            <Bar dataKey="wins" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
