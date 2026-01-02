'use client'

import { useEffect, useMemo, useState } from 'react'

/* =======================
   Types
======================= */

type PlayerStats = {
  username: string
  matchesPlayed: number
  gamesPlayed: number
  gamesWon: number

  timesOffered: number
  timesSold: number

  offersMade: number
  offersAccepted: number

  averageOfferValue: number
}

type TeamCombo = {
  combo: string
  wins: number
}

type SortKey =
  | 'username'
  | 'matchesPlayed'
  | 'gamesWinRate'
  | 'offersAcceptedRate'
  | 'timesSoldRate'

/* =======================
   Helpers
======================= */

function pct(success: number, total: number) {
  return total > 0 ? +(success / total * 100).toFixed(1) : 0
}

function format(success: number, total: number) {
  return `${success} / ${total} (${pct(success, total)}%)`
}

/* =======================
   Component
======================= */

export default function StatsTab() {
  const [players, setPlayers] = useState<PlayerStats[]>([])
  const [combos, setCombos] = useState<TeamCombo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sortKey, setSortKey] = useState<SortKey>('gamesWinRate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  /* =======================
     Fetch
  ======================= */

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setPlayers(data.players ?? [])
        setCombos(data.topWinningCombos ?? [])
      })
      .catch(err => {
        console.error(err)
        setError('Failed to load statistics')
      })
      .finally(() => setLoading(false))
  }, [])

  /* =======================
     Derived
  ======================= */

  const filteredPlayers = useMemo(
    () =>
      players.filter(
        p => !p.username.toLowerCase().startsWith('ztest')
      ),
    [players]
  )

  const enrichedPlayers = useMemo(() => {
    return filteredPlayers.map(p => ({
      ...p,
      gamesWinRate: pct(p.gamesWon, p.gamesPlayed),
      offersAcceptedRate: pct(p.offersAccepted, p.offersMade),
      timesSoldRate: pct(p.timesSold, p.timesOffered),
    }))
  }, [filteredPlayers])

  const sortedPlayers = useMemo(() => {
    return [...enrichedPlayers].sort((a: any, b: any) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]

      if (typeof aVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [enrichedPlayers, sortKey, sortDir])

  const topCombos = useMemo(
    () => combos.slice(0, 5),
    [combos]
  )

  /* =======================
     UI States
  ======================= */

  if (loading) {
    return (
      <div className="bg-slate-700/60 p-6 rounded-xl text-center text-gray-300">
        Loading statistics…
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-slate-700/60 p-6 rounded-xl text-center text-red-400">
        {error}
      </div>
    )
  }

  /* =======================
     Render
  ======================= */

  return (
    <div className="space-y-10">
      {/* ================= Player Table ================= */}
      <div className="bg-slate-700/60 p-4 rounded-xl overflow-x-auto">
        <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">
          Player Statistics
        </h3>

        <table className="min-w-full text-sm text-white">
          <thead className="bg-slate-800/80">
            <tr>
              <Header label="Player" />
              <Header label="Matches" />
              <Header label="Game Win Rate" />
              <Header label="Offers Accepted" />
              <Header label="Sale Success" />
              <Header label="Avg Offer (£)" />
            </tr>
          </thead>

          <tbody>
            {sortedPlayers.map(p => (
              <tr
                key={p.username}
                className="border-b border-slate-600 hover:bg-slate-700/40"
              >
                <td className="px-3 py-2 font-semibold">
                  {p.username}
                </td>

                <td className="px-3 py-2 text-center">
                  {p.matchesPlayed}
                </td>

                <td className="px-3 py-2 text-center">
                  {format(p.gamesWon, p.gamesPlayed)}
                </td>

                <td className="px-3 py-2 text-center">
                  {format(p.offersAccepted, p.offersMade)}
                </td>

                <td className="px-3 py-2 text-center">
                  {format(p.timesSold, p.timesOffered)}
                </td>

                <td className="px-3 py-2 text-center text-green-300">
                  {p.averageOfferValue.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= Winning Combos ================= */}
      <div className="bg-slate-700/60 p-4 rounded-xl">
        <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">
          Top 5 Winning Team Combinations
        </h3>

        {topCombos.length === 0 ? (
          <p className="text-center text-gray-400 py-6">
            No completed games yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {topCombos.map((c, i) => {
              const max = topCombos[0].wins
              const pct = (c.wins / max) * 100

              return (
                <li
                  key={c.combo}
                  className="bg-slate-800/80 p-3 rounded"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-yellow-400 font-bold">
                      {i + 1}.
                    </span>
                    <span className="truncate font-semibold">
                      {c.combo}
                    </span>
                    <span className="ml-auto text-green-300 font-bold">
                      {c.wins} wins
                    </span>
                  </div>

                  <div className="h-3 bg-slate-600 rounded">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-lime-400 rounded"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

/* =======================
   Sub
======================= */

function Header({ label }: { label: string }) {
  return (
    <th className="px-3 py-2 text-left text-gray-300">
      {label}
    </th>
  )
}
