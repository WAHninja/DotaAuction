'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ChevronUp, ChevronDown, ChevronsUpDown, TrendingUp, TrendingDown, Minus } from 'lucide-react'

/* =======================
   Types
======================= */

import type { PlayerStats, TeamCombo, SortKey } from '@/types';

/* =======================
   Helpers
======================= */

function pct(success: number, total: number) {
  return total > 0 ? +(success / total * 100).toFixed(1) : 0
}

function formatGold(value: number) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toString()
}

function pctColour(value: number): string {
  if (value >= 60) return 'text-green-300 bg-green-400/10 border-green-500/30'
  if (value >= 40) return 'text-yellow-300 bg-yellow-400/10 border-yellow-500/30'
  return 'text-red-300 bg-red-400/10 border-red-500/30'
}

function PctBadge({ success, total }: { success: number; total: number }) {
  const rate = pct(success, total)
  if (total === 0) return <span className="text-slate-500 text-xs">—</span>
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${pctColour(rate)}`}
      title={`${success} / ${total}`}
    >
      {rate}%
      <span className="text-[10px] opacity-60 font-normal">{success}/{total}</span>
    </span>
  )
}

function GoldValue({ value }: { value: number }) {
  const isPositive = value > 0
  const isNegative = value < 0
  const colour = isPositive ? 'text-green-300' : isNegative ? 'text-red-300' : 'text-slate-400'
  return (
    <span className={`flex items-center justify-center gap-1 font-semibold tabular-nums ${colour}`}>
      {isPositive
        ? <TrendingUp className="w-3 h-3" />
        : isNegative
        ? <TrendingDown className="w-3 h-3" />
        : <Minus className="w-3 h-3" />}
      {isPositive ? '+' : ''}{formatGold(value)}
      <Image src="/Gold_symbol.webp" alt="Gold" width={13} height={13} />
    </span>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 opacity-40" />
  return dir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'username' ? 'asc' : 'desc')
    }
  }

  const filteredPlayers = useMemo(
    () => players.filter(p => !p.username.toLowerCase().startsWith('ztest')),
    [players]
  )

  const enrichedPlayers = useMemo(() => filteredPlayers.map(p => ({
    ...p,
    gamesWinRate: pct(p.gamesWon, p.gamesPlayed),
    offerAcceptRate: pct(p.offersAccepted, p.offersMade),
  })), [filteredPlayers])

  const sortedPlayers = useMemo(() => {
    return [...enrichedPlayers].sort((a: any, b: any) => {
      const aVal = a[sortKey], bVal = b[sortKey]
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [enrichedPlayers, sortKey, sortDir])

  const topCombos = useMemo(() => combos.slice(0, 5), [combos])

  if (loading) {
    return <div className="bg-slate-700/60 p-6 rounded-xl text-center text-gray-300">Loading statistics…</div>
  }

  if (error) {
    return <div className="bg-slate-700/60 p-6 rounded-xl text-center text-red-400">{error}</div>
  }

  const columns: { label: string; sublabel?: string; key: SortKey; tooltip: string }[] = [
    { label: 'Win Rate',      sublabel: 'games',             key: 'gamesWinRate',      tooltip: 'Games won out of games played' },
    { label: 'Offer Hit Rate', sublabel: 'as buyer',         key: 'offerAcceptRate',   tooltip: 'How often the offers you submit get accepted by the losing team' },
    { label: 'Market Value',  sublabel: 'avg bid received',  key: 'averageOfferValue', tooltip: 'Average gold offered for you — how much opponents think you\'re worth' },
    { label: 'Times Traded',  sublabel: 'sold',              key: 'timesSold',         tooltip: 'How many times you\'ve been transferred via the auction' },
    { label: 'Net Gold',      sublabel: 'all time',          key: 'netGold',           tooltip: 'Total gold earned minus losses across all games — wins, penalties, and auction payouts combined' },
  ]

  return (
    <div className="space-y-8">

      {/* ================= Leaderboard ================= */}
      <div className="bg-slate-800/60 rounded-xl overflow-hidden border border-slate-700">
        <div className="px-5 py-4 border-b border-slate-700 flex items-baseline justify-between">
          <div>
            <h3 className="text-lg font-bold text-yellow-400">Player Leaderboard</h3>
            <p className="text-xs text-slate-400 mt-0.5">Click any column to sort · Hover for descriptions</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-white">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-700">
                <th className="px-3 py-3 w-10 text-slate-500 font-medium text-xs text-center">#</th>

                <th
                  className="px-3 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white transition-colors select-none"
                  onClick={() => handleSort('username')}
                >
                  <span className="flex items-center gap-1">
                    Player
                    <SortIcon active={sortKey === 'username'} dir={sortDir} />
                  </span>
                </th>

                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`px-3 py-3 text-center cursor-pointer select-none transition-colors whitespace-nowrap ${
                      sortKey === col.key ? 'text-yellow-400' : 'text-slate-400 hover:text-white'
                    }`}
                    title={col.tooltip}
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="flex flex-col items-center gap-0.5">
                      <span className="flex items-center gap-1">
                        {col.label}
                        <SortIcon active={sortKey === col.key} dir={sortDir} />
                      </span>
                      {col.sublabel && (
                        <span className="text-[10px] font-normal opacity-40">{col.sublabel}</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {sortedPlayers.map((p, i) => (
                <tr
                  key={p.username}
                  className={`border-b border-slate-700/50 transition-colors ${
                    i === 0 ? 'bg-yellow-400/5 hover:bg-yellow-400/8' : 'hover:bg-slate-700/30'
                  }`}
                >
                  {/* Rank */}
                  <td className="px-3 py-3 text-center text-xs font-bold">
                    <span className={
                      i === 0 ? 'text-yellow-400' :
                      i === 1 ? 'text-slate-300' :
                      i === 2 ? 'text-amber-600' :
                      'text-slate-600'
                    }>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </span>
                  </td>

                  {/* Name + games played hint */}
                  <td className="px-3 py-3">
                    <span className={`font-semibold ${i === 0 ? 'text-yellow-300' : 'text-white'}`}>
                      {p.username}
                    </span>
                    {p.gamesPlayed > 0 && (
                      <span className="ml-2 text-[10px] text-slate-500">{p.gamesPlayed}g</span>
                    )}
                  </td>

                  {/* Win Rate */}
                  <td className="px-3 py-3 text-center">
                    <PctBadge success={p.gamesWon} total={p.gamesPlayed} />
                  </td>

                  {/* Offer Hit Rate */}
                  <td className="px-3 py-3 text-center">
                    <PctBadge success={p.offersAccepted} total={p.offersMade} />
                  </td>

                  {/* Market Value */}
                  <td className="px-3 py-3 text-center">
                    {p.timesOffered > 0 ? (
                      <span className="inline-flex items-center justify-center gap-1 text-yellow-300 font-semibold tabular-nums">
                        {p.averageOfferValue.toFixed(0)}
                        <Image src="/Gold_symbol.webp" alt="Gold" width={13} height={13} />
                        <span className="text-[10px] text-slate-500 font-normal">×{p.timesOffered}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">—</span>
                    )}
                  </td>

                  {/* Times Traded */}
                  <td className="px-3 py-3 text-center">
                    {p.timesSold > 0
                      ? <span className="text-blue-300 font-semibold">{p.timesSold}</span>
                      : <span className="text-slate-500 text-xs">—</span>
                    }
                  </td>

                  {/* Net Gold */}
                  <td className="px-3 py-3">
                    <GoldValue value={p.netGold} />
                  </td>
                </tr>
              ))}

              {sortedPlayers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-slate-500">
                    No player data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-2.5 border-t border-slate-700">
          <p className="text-[11px] text-slate-500">
            Market Value shows avg bid × times offered. Net Gold is the sum of all win rewards, loss penalties, and auction payouts.
          </p>
        </div>
      </div>

      {/* ================= Winning Combos ================= */}
      <div className="bg-slate-800/60 rounded-xl overflow-hidden border border-slate-700">
        <div className="px-5 py-4 border-b border-slate-700">
          <h3 className="text-lg font-bold text-yellow-400">Top Winning Combinations</h3>
          <p className="text-xs text-slate-400 mt-0.5">Most frequent winning team compositions</p>
        </div>

        <div className="p-4">
          {topCombos.length === 0 ? (
            <p className="text-center text-slate-500 py-6">No completed games yet.</p>
          ) : (
            <ul className="space-y-3">
              {topCombos.map((c, i) => {
                const barPct = (c.wins / topCombos[0].wins) * 100
                return (
                  <li key={c.combo} className="bg-slate-900/50 p-3 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold w-6 text-center">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </span>
                      <span className="truncate font-semibold text-sm text-white">{c.combo}</span>
                      <span className="ml-auto text-green-300 font-bold text-sm whitespace-nowrap">
                        {c.wins} {c.wins === 1 ? 'win' : 'wins'}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-green-400 rounded-full transition-all duration-500"
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

    </div>
  )
}
