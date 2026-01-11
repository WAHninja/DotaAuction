'use client'

import { useState } from 'react'
import Image from 'next/image'

type PlayerStat = {
  id: number
  username: string
  goldChange: number
  reason: 'win_reward' | 'offer_gain' | 'loss_penalty'
  teamId: 'team_1' | 'team_a'
}

type Offer = {
  id: number
  fromUsername: string
  targetUsername: string
  offerAmount: number
  status: 'pending' | 'accepted' | 'rejected'
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
}

type GameHistoryProps = {
  games: Game[]
}

export default function GameHistory({ games }: GameHistoryProps) {
  const [expandedGameId, setExpandedGameId] = useState<number | null>(
    games.find(g => g.defaultExpanded)?.gameId ?? null
  )

  return (
    <div className="space-y-4">
      {games.map(game => {
        const isExpanded = expandedGameId === game.gameId
        const acceptedOffer = game.offers.find(o => o.status === 'accepted')

        return (
          <div
            key={game.gameId}
            className={`p-4 border rounded-lg shadow cursor-pointer ${
              game.highlight ? 'border-yellow-400' : 'border-gray-300'
            }`}
            onClick={() =>
              setExpandedGameId(isExpanded ? null : game.gameId)
            }
          >
            <h3 className="text-xl font-semibold flex justify-between items-center">
              <span>
                Game #{game.gameNumber} – {game.winningTeam ?? 'Pending'}
              </span>
              <button className="text-sm">{isExpanded ? 'Hide' : 'Show'} details</button>
            </h3>

            {/* Show accepted offer summary when not expanded */}
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
                  <strong>Team A:</strong> {game.teamAMembers.join(', ')}<br />
                  <strong>Team 1:</strong> {game.team1Members.join(', ')}
                </div>

                {/* Player Stats / Gold Changes */}
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
                            ({stat.reason.replace('_', ' ')}, {stat.teamId})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Offers */}
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
