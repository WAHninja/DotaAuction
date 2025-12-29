'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

type PlayerStats = {
  id: number;
  username: string;
  matches: number;
  gamesPlayed: number;
  gamesWon: number;
  offersAccepted: number;
  offersMade: number;
  timesSold: number;
};

type TeamComboStat = {
  players: string[];
  wins: number;
};

type StatsTabProps = {
  players: PlayerStats[];
  teamCombos: TeamComboStat[];
};

export default function StatsTab({ players, teamCombos }: StatsTabProps) {
  /* ---------------------------
     Player derived stats
  ---------------------------- */
  const playerRows = players.map((p) => {
    const winPct = p.gamesPlayed
      ? Math.round((p.gamesWon / p.gamesPlayed) * 100)
      : 0;

    const offerPct = p.offersMade
      ? Math.round((p.offersAccepted / p.offersMade) * 100)
      : 0;

    const soldPct = p.gamesPlayed
      ? Math.round((p.timesSold / p.gamesPlayed) * 100)
      : 0;

    return {
      ...p,
      winPct,
      offerPct,
      soldPct,
    };
  });

  /* ---------------------------
     Top 5 winning team combos
  ---------------------------- */
  const topCombos = [...teamCombos]
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 5)
    .map((combo, index) => ({
      rank: index + 1,
      name: combo.players.join(' · '),
      wins: combo.wins,
    }));

  return (
    <div className="space-y-8">

      {/* =======================
           PLAYER STATS TABLE
      ======================== */}
      <div className="bg-slate-800/60 border border-slate-600 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-amber-400 mb-4">
          Player Statistics
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-300 border-b border-slate-600">
                <th className="px-3 py-2 text-left">Player</th>
                <th className="px-3 py-2 text-center">Matches</th>
                <th className="px-3 py-2 text-center">Games Won</th>
                <th className="px-3 py-2 text-center">Offers Accepted</th>
                <th className="px-3 py-2 text-center">Times Sold</th>
              </tr>
            </thead>

            <tbody>
              {playerRows.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-700 hover:bg-slate-700/40"
                >
                  <td className="px-3 py-2 font-medium text-slate-100">
                    {p.username}
                  </td>

                  <td className="px-3 py-2 text-center">
                    {p.matches}
                  </td>

                  <td className="px-3 py-2 text-center">
                    <div className="font-semibold">{p.gamesWon}</div>
                    <div className="text-xs text-slate-400">
                      ({p.winPct}%)
                    </div>
                  </td>

                  <td className="px-3 py-2 text-center">
                    <div className="font-semibold">{p.offersAccepted}</div>
                    <div className="text-xs text-slate-400">
                      ({p.offerPct}%)
                    </div>
                  </td>

                  <td className="px-3 py-2 text-center">
                    <div className="font-semibold">{p.timesSold}</div>
                    <div className="text-xs text-slate-400">
                      ({p.soldPct}%)
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =======================
         TOP TEAM COMBINATIONS
      ======================== */}
      <div className="bg-slate-800/60 border border-slate-600 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-amber-400 mb-4 text-center">
          Top Winning Team Combinations
        </h2>

        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topCombos}
              layout="vertical"
              margin={{ left: 20, right: 20 }}
            >
              <XAxis
                type="number"
                hide
              />
              <YAxis
                type="category"
                dataKey="name"
                width={260}
                tick={{ fill: '#cbd5f5', fontSize: 12 }}
              />

              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{
                  backgroundColor: '#020617',
                  border: '1px solid #334155',
                }}
              />

              <Bar
                dataKey="wins"
                fill="#d97706"
                radius={[6, 6, 6, 6]}
                barSize={22}
              >
                <LabelList
                  dataKey="wins"
                  position="insideRight"
                  fill="#f8fafc"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-3 text-xs text-slate-400 text-center">
          Showing top 5 most successful player combinations
        </p>
      </div>
    </div>
  );
}
