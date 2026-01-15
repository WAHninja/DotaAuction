'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getAblyClient } from '@/lib/ably-client'

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
  matchId: string
  initialGames: Game[]
}

export default function GameHistory({ matchId, initialGames }: GameHistoryProps) {
  const [expandedGameId, setExpandedGameId] = useState<number | null>(
    initialGames.find(g => g.defaultExpanded)?.gameId ?? null
  )
  const [mergedGames, setMergedGames] = useState<Game[]>(initialGames)

  /* ---------------- Real-time updates via Ably ---------------- */
  useEffect(() => {
    const ably = getAblyClient()
    const matchChannel = ably.channels.get(`match-${matchId}`)

    const handleNewGame = (data: any) => {
      if (!data?.game) return
      setMergedGames(prev => {
        // Avoid duplicating the same game
        if (prev.find(g => g.gameId === data.game.gameId)) return prev
        return [...prev, data.game]
      })
    }

    matchChannel.subscribe('game-winner-selected', handleNewGame)

    return () => matchChannel.unsubscribe('game-winner-selected', handleNewGame)
  }, [matchId])

  return (
    <div className="space-y-4">
      {mergedGames
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(game => {
          const isExpanded = expandedGameId === game.gameId
          const acceptedOffer = game.offers.find(o => o.status === 'accepted')

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

              {!isExpanded && acceptedOffer && (
                <p className="mt-2 text-sm font-medium">
                  {acceptedOffer.fromUsername} traded {acceptedOffer.targetUsername} for{' '}
                  {acceptedOffer.offerAmount}
                  <Image
                    src="/Gold_symbol.webp"
                    alt="Gold"
                    width={16}
                    height={16}
                    className="inline-block ml-1 align-middle"
                  />
                </p>
              )}

              {isExpanded && (
                <>
                  <div className="mt-2">
                    <strong>Winner:</strong> {game.winningTeam ?? 'N/A'}<br />
                    <strong>Team A:</strong> {game.teamAMembers.join(', ') || 'N/A'}<br />
                    <strong>Team 1:</strong> {game.team1Members.join(', ') || 'N/A'}
                  </div>

                  {game.playerStats.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-bold">Gold changes:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {game.playerStats.map(stat => (
                          <li key={stat.id}>
                            <span className="font-medium">{stat.username}</span>:
                            <span
                              className={`ml-1 font-semibold ${
                                stat.goldChange > 0
                                  ? 'text-green-400'
                                  : stat.goldChange < 0
                                  ? 'text-red-500'
                                  : 'text-gray-400'
                              }`}
                            >
                              {stat.goldChange > 0 ? `+${stat.goldChange}` : stat.goldChange}
                            </span>
                            <Image
                              src="/Gold_symbol.webp"
                              alt="Gold"
                              width={16}
                              height={16}
                              className="inline-block ml-1 align-middle"
                            />
                            <span className="text-sm text-gray-400 ml-2">
                              ({stat.reason?.replace('_', ' ') ?? 'N/A'}, {stat.teamId ?? 'N/A'})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {game.offers.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-bold">Offers:</h4>
                      <ul className="list-disc list-inside">
                        {game.offers.map(offer => (
                          <li key={offer.id}>
                            {offer.fromUsername} offered {offer.targetUsername} for {offer.offerAmount}
                            <Image
                              src="/Gold_symbol.webp"
                              alt="Gold"
                              width={16}
                              height={16}
                              className="inline-block ml-1 align-middle"
                            />{' '}
                            (<span
                              className={`font-semibold ${
                                offer.status === 'accepted'
                                  ? 'text-green-500'
                                  : offer.status === 'rejected'
                                  ? 'text-red-500'
                                  : 'text-gray-400'
                              }`}
                            >
                              {offer.status}
                            </span>)
                          </li>
                        ))}
                      </ul>
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
