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

export default function GameHistory({
  games,
  liveOffers = [],
  livePlayerStats = []
}: GameHistoryProps) {
  const [expandedGameId, setExpandedGameId] = useState<number | null>(
    games.find(g => g.defaultExpanded)?.gameId ?? null
  )
  const [mergedGames, setMergedGames] = useState<Game[]>(games)

  // Merge live updates into the latest game
  useEffect(() => {
    if (!games.length) return
    const latestGame = games[games.length - 1]
    if (!latestGame) return

    const updatedGames = games.map(game => {
      if (game.gameId !== latestGame.gameId) return game
      return {
        ...game,
        offers: liveOffers.length ? liveOffers : game.offers,
        playerStats: livePlayerStats.length ? livePlayerStats : game.playerStats
      }
    })

    setMergedGames(updatedGames)
  }, [liveOffers, livePlayerStats, games])

  // Helper: Get player stats by team
  const getTeamStats = (game: Game, team: 'team1' | 'teamA') =>
    game.playerStats.filter(stat => stat.teamId === team)

  // Helper: Calculate max gold change for scaling bars
  const getMaxGold = (game: Game) => {
    const allGolds = game.playerStats.map(s => Math.abs(s.goldChange))
    return allGolds.length ? Math.max(...allGolds) : 1
  }

  return (
    <div className="space-y-6">
      {mergedGames.map(game => {
        const isExpanded = expandedGameId === game.gameId
        const acceptedOffer = game.offers.find(o => o.status === 'accepted')
        const maxGold = getMaxGold(game)
        const team1Stats = getTeamStats(game, 'team1')
        const teamAStats = getTeamStats(game, 'teamA')

        return (
          <div
            key={game.gameId}
            className={`p-4 border rounded-lg shadow cursor-pointer ${
              game.highlight ? 'border-yellow-400' : 'border-gray-300'
            }`}
            onClick={() => setExpandedGameId(isExpanded ? null : game.gameId)}
          >
            {/* ---------------- Header ---------------- */}
            <h3 className="text-xl font-semibold flex justify-between items-center">
              <span>
                Game #{game.gameNumber} – {game.winningTeam ?? 'Pending'}
              </span>
              <button className="text-sm">{isExpanded ? 'Hide' : 'Show'} details</button>
            </h3>

            {/* ---------------- Gold Timeline ---------------- */}
            {!isExpanded && game.playerStats.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-sm font-medium">Team 1 Gold:</div>
                <div className="flex h-4 gap-1">
                  {team1Stats.map(stat => (
                    <div
                      key={stat.id}
                      className="h-full"
                      style={{
                        width: `${(Math.abs(stat.goldChange) / maxGold) * 100}%`,
                        backgroundColor: stat.goldChange > 0 ? '#22c55e' : '#ef4444'
                      }}
                      title={`${stat.username}: ${stat.goldChange}`}
                    />
                  ))}
                </div>

                <div className="text-sm font-medium mt-1">Team A Gold:</div>
                <div className="flex h-4 gap-1">
                  {teamAStats.map(stat => (
                    <div
                      key={stat.id}
                      className="h-full"
                      style={{
                        width: `${(Math.abs(stat.goldChange) / maxGold) * 100}%`,
                        backgroundColor: stat.goldChange > 0 ? '#22c55e' : '#ef4444'
                      }}
                      title={`${stat.username}: ${stat.goldChange}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ---------------- Accepted Offer Summary ---------------- */}
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

            {/* ---------------- Expanded Details ---------------- */}
            {isExpanded && (
              <>
                <div className="mt-2">
                  <strong>Winner:</strong> {game.winningTeam ?? 'N/A'}<br />
                  <strong>Team A:</strong> {game.teamAMembers.join(', ') || 'N/A'}<br />
                  <strong>Team 1:</strong> {game.team1Members.join(', ') || 'N/A'}
                </div>

                {/* Player Stats / Gold Changes */}
                {game.playerStats && game.playerStats.length > 0 && (
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

                {/* Offers */}
                {game.offers && game.offers.length > 0 && (
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
