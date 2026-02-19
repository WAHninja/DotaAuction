'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

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
  | 'averageOfferValue'

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
     Sort handler
  ======================= */

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      // Strings default ascending, numbers default descending
      setSortDir(key === 'username' ? 'asc' : 'desc')
    }
  }

  /* =======================
     Derived
  ======================= */

  const filteredPlayers = useMemo(
    () => players.filter(p => !p.username.toLowerCase().startsWith('ztest')),
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
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [enrichedPlayers, sortKey, sortDir])

  const topCombos = useMemo(() => combos.slice(0, 5), [combos])

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
     Column config
  ======================= */

  const columns: { label: string; key: SortKey; title?: string }[] = [
    { label: 'Player',          key: 'username' },
    { label: 'Matches',         key: 'matchesPlayed' },
    { label: 'Game Win Rate',   key: 'gamesWinRate' },
    { label: 'Offers Accepted', key: 'offersAcceptedRate' },
    { label: 'Sale Success',    key: 'timesSoldRate' },
    { label: 'Avg Offer',       key: 'averageOfferValue', title: 'Average offer amount received as target' },
  ]

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
              {columns.map(col => (
                <SortableHeader
                  key={col.key}
                  label={col.label}
                  title={col.title}
                  sortKey={col.key}
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  // Gold icon suffix for the Avg Offer column
                  suffix={col.key === 'averageOfferValue' ? (
                    <Image
                      src="/Gold_symbol.webp"
                      alt="Gold"
                      width={14}
                      height={14}
                      className="inline-block ml-1 align-middle"
                    />
                  ) : undefined}
                />
              ))}
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
                <td className="px-3 py-2 text-center">{format(p.gamesWon, p.gamesPlayed)}</td>
                <td className="px-3 py-2 text-center">{format(p.offersAccepted, p.offersMade)}</td>
                <td className="px-3 py-2 text-center">{format(p.timesSold, p.timesOffered)}</td>
                <td className="px-3 py-2 text-center">
                  <span className="text-green-300 flex items-center justify-center gap-1">
                    {p.averageOfferValue.toFixed(1)}
                    <Image src="/Gold_symbol.webp" alt="Gold" width={14} height={14} />
                  </span>
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
          <p className="text-center text-gray-400 py-6">No completed games yet.</p>
        ) : (
          <ul className="space-y-3">
            {topCombos.map((c, i) => {
              const max = topCombos[0].wins
              const barPct = (c.wins / max) * 100

              return (
                <li key={c.combo} className="bg-slate-800/80 p-3 rounded">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-yellow-400 font-bold">{i + 1}.</span>
                    <span className="truncate font-semibold">{c.combo}</span>
                    <span className="ml-auto text-green-300 font-bold">{c.wins} wins</span>
                  </div>
                  <div className="h-3 bg-slate-600 rounded">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-lime-400 rounded"
                      style={{ width: `${barPct}%` }}
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
   SortableHeader
======================= */

function SortableHeader({
  label,
  title,
  sortKey,
  activeSortKey,
  sortDir,
  onSort,
  suffix,
}: {
  label: string
  title?: string
  sortKey: SortKey
  activeSortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
  suffix?: React.ReactNode
}) {
  const isActive = sortKey === activeSortKey

  return (
    <th
      className={`px-3 py-2 text-left cursor-pointer select-none transition-colors group ${
        isActive ? 'text-yellow-400' : 'text-gray-300 hover:text-white'
      }`}
      title={title}
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1 whitespace-nowrap">
        {label}
        {suffix}
        <span className="ml-1 opacity-60 group-hover:opacity-100">
          {isActive ? (
            sortDir === 'desc' ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )
          ) : (
            <ChevronsUpDown className="w-3 h-3" />
          )}
        </span>
      </span>
    </th>
  )
}
