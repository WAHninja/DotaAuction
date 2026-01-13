'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

type PlayerStat = {
  id: number
  username: string
  goldChange: number
  reason: 'win_reward' | 'offer_gain' | 'loss_penalty'
  teamId: 'team1' | 'teamA' | string
}

type Offer = {
  id: number
  fromUsername: string
  targetUsername: string
  offerAmount: number
  status: 'pending' | 'accepted' | 'rejected'
  gameId?: number
}

type Game = {
  gameId: number
  gameNumber: number
  createdAt: string
  teamAMembers: string[]
  team1Members: string[]
  winningTeam: 'team_a' | 'team_1' | null
  offers: Offer[]
  playerStats: PlayerStat[]
  highlight?: boolean
  defaultExpanded?: boolean
  status?: string
}

type GameHistoryProps = {
  games: Game[]
  liveOffers?: Offer[]
  livePlayerStats?: PlayerStat[]
}

export default function GameHistory({ games, liveOffers = [], livePlayerStats = [] }: GameHistoryProps) {
  const [expandedGameId, setExpandedGameId] = useState<number | null>(
    games.find(g => g.defaultExpanded)?.gameId ?? null
  )
  const [mergedGames, setMergedGames] = useState<Game[]>(games)

  // Merge live updates into latest game
  useEffect(() => {
    if (!games.length) return
    const latestGame = games[games.length - 1]
    if (!latestGame) return

    const updatedGames = games.map(game => {
      if (game.gameId !== latestGame.gameId) return game
      return {
        ...game,
        offers: liveOffers.length ? liveOffers : game.offers,
        playerStats: livePlayerStats.length ? livePlayerStats : game.playerStats,
      }
    })
    setMergedGames(updatedGames)
  }, [liveOffers, livePlayerStats, games])

  return (
    <div className="space-y-6">
      {mergedGames.map(game => {
        const isExpanded = expandedGameId === game.gameId

        // All accepted offers for collapsed summary
        const acceptedOffers = game.offers.filter(o => o.status === 'accepted')

        // Split player stats by team
        const team1Stats = game.playerStats.filter(s => s.teamId === 'team1')
        const teamAStats = game.playerStats.filter(s => s.teamId === 'teamA')

        return (
          <div
            key={game.gameId}
            className={`p-4 border rounded-lg shadow cursor-pointer ${
              game.highlight ? 'border-yellow-400' : 'border-gray-300'
            }`}
            onClick={() => setExpandedGameId(isExpanded ? null : game.gameId)}
          >
            <h3 className="text-xl font-semibold flex justify-between items-center">
              <span>
                Game #{game.gameNumber} – {game.winningTeam ?? 'Pending'}
              </span>
              <button className="text-sm">{isExpanded ? 'Hide' : 'Show'} details</button>
            </h3>

            {/* Collapsed Summary */}
            {!isExpanded && acceptedOffers.length > 0 && (
              <p className="mt-2 text-sm font-medium">
                Trades:{' '}
                {acceptedOffers
                  .map(o => `${o.fromUsername} → ${o.targetUsername}: ${o.offerAmount}`)
                  .join(', ')}
              </p>
            )}

            {isExpanded && (
              <>
                <div className="mt-2 space-y-2">
                  <div>
                    <strong>Winner:</strong> {game.winningTeam ?? 'N/A'}
                  </div>
                  <div>
                    <strong>Team A:</strong> {game.teamAMembers.join(', ') || 'N/A'}
                  </div>
                  <div>
                    <strong>Team 1:</strong> {game.team1Members.join(', ') || 'N/A'}
                  </div>
                </div>

                {/* Player Stats Tables */}
                {(team1Stats.length > 0 || teamAStats.length > 0) && (
                  <div className="mt-4 overflow-x-auto">
                    <h4 className="font-bold mb-2">Player Stats</h4>
                    <table className="min-w-full text-left border-collapse">
                      <thead>
                        <tr>
                          <th className="border-b px-2 py-1">Player</th>
                          <th className="border-b px-2 py-1">Team</th>
                          <th className="border-b px-2 py-1">Gold</th>
                          <th className="border-b px-2 py-1">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...team1Stats, ...teamAStats].map(stat => (
                          <tr key={stat.id}>
                            <td className="px-2 py-1">{stat.username}</td>
                            <td className="px-2 py-1">{stat.teamId === 'team1' ? 'Team 1' : 'Team A'}</td>
                            <td
                              className={`px-2 py-1 font-semibold ${
                                stat.goldChange > 0
                                  ? 'text-green-400'
                                  : stat.goldChange < 0
                                  ? 'text-red-500'
                                  : 'text-gray-400'
                              }`}
                            >
                              {stat.goldChange > 0 ? `+${stat.goldChange}` : stat.goldChange}{' '}
                              <Image
                                src="/Gold_symbol.webp"
                                alt="Gold"
                                width={16}
                                height={16}
                                className="inline-block ml-1 align-middle"
                              />
                            </td>
                            <td className="px-2 py-1 text-gray-400">{stat.reason?.replace('_', ' ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Offers Table */}
                {game.offers.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <h4 className="font-bold mb-2">Offers</h4>
                    <table className="min-w-full text-left border-collapse">
                      <thead>
                        <tr>
                          <th className="border-b px-2 py-1">From</th>
                          <th className="border-b px-2 py-1">To</th>
                          <th className="border-b px-2 py-1">Amount</th>
                          <th className="border-b px-2 py-1">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {game.offers.map(o => (
                          <tr key={o.id}>
                            <td className="px-2 py-1">{o.fromUsername}</td>
                            <td className="px-2 py-1">{o.targetUsername}</td>
                            <td className="px-2 py-1 font-semibold">
                              {o.offerAmount}{' '}
                              <Image
                                src="/Gold_symbol.webp"
                                alt="Gold"
                                width={16}
                                height={16}
                                className="inline-block ml-1 align-middle"
                              />
                            </td>
                            <td
                              className={`px-2 py-1 font-semibold ${
                                o.status === 'accepted'
                                  ? 'text-green-500'
                                  : o.status === 'rejected'
                                  ? 'text-red-500'
                                  : 'text-gray-400'
                              }`}
                            >
                              {o.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
