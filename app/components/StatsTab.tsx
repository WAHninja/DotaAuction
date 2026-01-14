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
  lastPlayedAt: string
}

type SortKey =
  | 'username'
  | 'matchesPlayed'
  | 'gamesPlayed'
  | 'gamesWinRate'
  | 'offersAcceptedRate'
  | 'tradedRate'

type RangeFilter = '10' | '30' | 'all'

/* =======================
   Helpers
======================= */

function pct(success: number, total: number) {
  return total > 0 ? +(success / total * 100).toFixed(1) : 0
}

function sortArrow(dir: 'asc' | 'desc') {
  return dir === 'asc' ? '▲' : '▼'
}

// 🔑 Normalize combo names so order never matters
function normalizeCombo(combo: string) {
  return combo
    .split(',')
    .map(p => p.trim())
    .sort((a, b) => a.localeCompare(b))
    .join(' + ')
}

/* =======================
   Component
======================= */

export default function StatsTab() {
  const [players, setPlayers] = useState<PlayerStats[]>([])
  const [rawCombos, setRawCombos] = useState<TeamCombo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sortKey, setSortKey] = useState<SortKey>('gamesPlayed')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const [range, setRange] = useState<RangeFilter>('all')

  /* =======================
     Fetch
  ======================= */

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' })
        if (!res.ok) throw new Error()
        const data = await res.json()

        setPlayers(data.players ?? [])
        setRawCombos(data.topWinningCombos ?? [])
      } catch {
        setError('Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  /* =======================
     Player Stats
  ======================= */

  const enrichedPlayers: EnrichedPlayerStats[] = useMemo(() => {
    return players
      .filter(p => !p.username.toLowerCase().startsWith('ztest'))
      .map(p => ({
        ...p,
        gamesWinRate: pct(p.gamesWon, p.gamesPlayed),
        offersAcceptedRate: pct(p.offersAccepted, p.offersMade),
        tradedRate: pct(p.timesSold, p.timesOffered),
      }))
  }, [players])

  const sortedPlayers = useMemo(() => {
    return [...enrichedPlayers].sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? 0
      const bVal = (b as any)[sortKey] ?? 0

      if (typeof aVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [enrichedPlayers, sortKey, sortDir])

  /* =======================
     Top Combos (FILTER + NORMALIZE)
  ======================= */

  const topCombos = useMemo(() => {
    const now = Date.now()

    const filtered = rawCombos.filter(c => {
      if (range === 'all') return true
      const days = range === '10' ? 10 : 30
      return now - new Date(c.lastPlayedAt).getTime() <= days * 86400000
    })

    const map = new Map<string, number>()

    for (const c of filtered) {
      const key = normalizeCombo(c.combo)
      map.set(key, (map.get(key) ?? 0) + c.wins)
    }

    return [...map.entries()]
      .map(([combo, wins]) => ({ combo, wins }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 5)
  }, [rawCombos, range])

  /* =======================
     Sorting Handler
  ======================= */

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  /* =======================
     UI States
  ======================= */

  if (loading) return <div className="p-6 text-center">Loading…</div>
  if (error) return <div className="p-6 text-center text-red-400">{error}</div>

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
              {[
                ['Player', 'username'],
                ['Matches', 'matchesPlayed'],
                ['Games Played', 'gamesPlayed'],
                ['Win Rate (%)', 'gamesWinRate'],
                ['Offers Accepted (%)', 'offersAcceptedRate'],
                ['Traded Rate (%)', 'tradedRate'],
              ].map(([label, key]) => (
                <th
                  key={key}
                  onClick={() => handleSort(key as SortKey)}
                  className="px-3 py-2 cursor-pointer select-none"
                >
                  {label} {sortKey === key && sortArrow(sortDir)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sortedPlayers.map(p => (
              <tr key={p.username} className="border-b border-slate-600">
                <td className="px-3 py-2">{p.username}</td>
                <td className="px-3 py-2 text-center">{p.matchesPlayed}</td>
                <td className="px-3 py-2 text-center">{p.gamesPlayed}</td>
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
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-yellow-400">
            Top Winning Team Combinations
          </h3>

          <div className="flex gap-2">
            {(['10', '30', 'all'] as RangeFilter[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded text-sm ${
                  range === r ? 'bg-yellow-400 text-black' : 'bg-slate-800'
                }`}
              >
                {r === 'all' ? 'All' : `Last ${r}`}
              </button>
            ))}
          </div>
        </div>

        {topCombos.length === 0 ? (
          <p className="text-center text-gray-400">No data</p>
        ) : (
          <ul className="space-y-3">
            {topCombos.map((c, i) => {
              const max = topCombos[0].wins || 1
              return (
                <li key={c.combo} className="bg-slate-800 p-3 rounded">
                  <div className="flex justify-between mb-2">
                    <span>{i + 1}. {c.combo}</span>
                    <span className="text-green-300">{c.wins} wins</span>
                  </div>
                  <div className="h-3 bg-slate-600 rounded">
                    <div
                      className="h-full bg-green-500 rounded"
                      style={{ width: `${(c.wins / max) * 100}%` }}
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
