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
}

type EnrichedPlayerStats = PlayerStats & {
  gamesWinRate: number
  offersAcceptedRate: number
  tradedRate: number
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
  | 'tradedRate'

/* =======================
   Helpers
======================= */

function pct(success: number, total: number) {
  return total > 0 ? +(success / total * 100).toFixed(1) : 0
}

function sortArrow(dir: 'asc' | 'desc') {
  return dir === 'asc' ? '▲' : '▼'
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
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats')
        if (!res.ok) throw new Error(`Network error: ${res.status}`)
        const data = await res.json()
        setPlayers(data.players ?? [])
        setCombos(data.topWinningCombos ?? [])
      } catch (err) {
        console.error(err)
        setError('Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  /* =======================
     Derived
  ======================= */

  const filteredPlayers = useMemo(
    () => players.filter(p => !p.username.toLowerCase().startsWith('ztest')),
    [players]
  )

  const enrichedPlayers: EnrichedPlayerStats[] = useMemo(() => {
    return filteredPlayers.map(p => ({
      ...p,
      gamesWinRate: pct(p.gamesWon, p.gamesPlayed),
      offersAcceptedRate: pct(p.offersAccepted, p.offersMade),
      tradedRate: pct(p.timesSold, p.timesOffered),
    }))
  }, [filteredPlayers])

  const sortedPlayers = useMemo(() => {
    return [...enrichedPlayers].sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? 0
      const bVal = (b as any)[sortKey] ?? 0

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [enrichedPlayers, sortKey, sortDir])

  const topCombos = useMemo(() => combos.slice(0, 5), [combos])

  /* =======================
     Sorting Handler
  ======================= */

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

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
              <SortableHeader
                label="Player"
                sortKey="username"
                currentSortKey={sortKey}
                sortDir={sortDir}
                onClick={handleSort}
              />
              <SortableHeader
                label="Matches"
                sortKey="matchesPlayed"
                currentSortKey={sortKey}
                sortDir={sortDir}
                onClick={handleSort}
              />
              <SortableHeader
                label="Game Win Rate (%)"
                sortKey="gamesWinRate"
                currentSortKey={sortKey}
                sortDir={sortDir}
                onClick={handleSort}
              />
              <SortableHeader
                label="Offers Accepted (%)"
                sortKey="offersAcceptedRate"
                currentSortKey={sortKey}
                sortDir={sortDir}
                onClick={handleSort}
              />
              <SortableHeader
                label="Traded Rate (%)"
                sortKey="tradedRate"
                currentSortKey={sortKey}
                sortDir={sortDir}
                onClick={handleSort}
              />
            </tr>
          </thead>

          <tbody>
            {sortedPlayers.map(p => (
              <tr
                key={p.username}
                className="border-b border-slate-600 hover:bg-slate-700/40"
              >
                <td className="px-3 py-2 font-semibold">{p.username}</td>
                <td className="px-3 py-2 text-center">{p.matchesPlayed}</td>
                <td className="px-3 py-2 text-center">{p.gamesWinRate}%</td>
                <td className="px-3 py-2 text-center">{p.offersAcceptedRate}%</td>
                <td className="px-3 py-2 text-center">{p.tradedRate}%</td>
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
              const maxWins = topCombos[0].wins
              const widthPct = maxWins > 0 ? (c.wins / maxWins) * 100 : 0

              return (
                <li key={c.combo} className="bg-slate-800/80 p-3 rounded">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-yellow-400 font-bold">{i + 1}.</span>
                    <span className="truncate font-semibold">{c.combo}</span>
                    <span className="ml-auto text-green-300 font-bold">
                      {c.wins} wins
                    </span>
                  </div>

                  <div className="h-3 bg-slate-600 rounded">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-lime-400 rounded"
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
  )
}

/* =======================
   Sub Components
======================= */

type SortableHeaderProps = {
  label: string
  sortKey: SortKey
  currentSortKey: SortKey
  sortDir: 'asc' | 'desc'
  onClick: (key: SortKey) => void
}

function SortableHeader({
  label,
  sortKey,
  currentSortKey,
  sortDir,
  onClick,
}: SortableHeaderProps) {
  const isActive = sortKey === currentSortKey

  return (
    <th
      scope="col"
      className="px-3 py-2 text-left text-gray-300 cursor-pointer select-none"
      onClick={() => onClick(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive && <span className="text-gray-400 text-xs">{sortArrow(sortDir)}</span>}
      </span>
    </th>
  )
}
