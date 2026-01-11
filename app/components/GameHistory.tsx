'use client'

import { useState } from 'react'
import Image from 'next/image'

type PlayerStat = {
  id: number
  playerId?: number
  username: string
  goldChange: number
  reason: 'win_reward' | 'offer_gain' | 'loss_penalty'
  teamId?: 'team_1' | 'team_a'
}

type Offer = {
  id: number
  from_username: string
  target_username: string
  offer_amount: number
  status: 'pending' | 'accepted' | 'rejected'
}

type Game = {
  gameNumber?: number
  gameId: number
  createdAt: string
  teamAMembers: string[]
  team1Members: string[]
  winningTeam: 'team_a' | 'team_1' | null
  playerStats: PlayerStat[]
  offers: Offer[]
}

type GameHistoryProps = {
  games: Game[]
}

export default function GameHistory({ games }: GameHistoryProps) {
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null)

  // Sort games newest first
  const sortedGames = games.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const toggleExpand = (gameNumber: number) => {
    setExpandedGameId(expandedGameId === gameNumber ? null : gameNumber)
  }

  return (
    <section className="space-y-4">
      {sortedGames.map((game, index) => {
        const isExpanded = expandedGameId === (game.gameNumber ?? game.gameId)
        const acceptedOffer = game.offers.find(o => o.status === 'accepted')

        return (
          <div
            key={game.gameNumber ?? game.gameId}
            className={`mb-4 p-4 border rounded-lg shadow cursor-pointer ${
              index === 0 ? 'border-yellow-400' : 'border-gray-300'
            }`}
            onClick={() => toggleExpand(game.gameNumber ?? game.gameId)}
          >
            <h3 className="text-xl font-semibold flex justify-between items-center">
              <span>
                Game #{game.gameNumber ?? game.gameId} – {game.winningTeam ?? 'Pending'}
              </span>
              <button className="text-sm">{isExpanded ? 'Hide' : 'Show'} details</button>
            </h3>

            {/* Show accepted offer summary when not expanded */}
            {!isExpanded && acceptedOffer && (
              <p className="mt-2 text-sm font-medium">
                {acceptedOffer.from_username} traded {acceptedOffer.target_username} for {acceptedOffer.offer_amount}
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

                {/* ---------------- Player Stats / Gold Changes ---------------- */}
                {game.playerStats.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-bold">Gold changes:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {/* Win Rewards First */}
                      {game.playerStats
                        .filter(stat => stat.reason === 'win_reward')
                        .map(stat => (
                          <li key={stat.id}>
                            {stat.username || `Player#${stat.playerId}`}:
                            <span className="text-green-400 font-semibold ml-1">
                              +{stat.goldChange}
                            </span>
                            <Image
                              src="/Gold_symbol.webp"
                              alt="Gold"
                              width={16}
                              height={16}
                              className="inline-block ml-1 align-middle"
                            />
                            <span className="text-sm text-gray-400 ml-2">(win reward)</span>
                          </li>
                        ))}

                      {/* Loss Penalties */}
                      {game.playerStats
                        .filter(stat => stat.reason === 'loss_penalty')
                        .map(stat => (
                          <li key={stat.id}>
                            {stat.username || `Player#${stat.playerId}`}:
                            <span className="text-red-500 font-semibold ml-1">{stat.goldChange}</span>
                            <Image
                              src="/Gold_symbol.webp"
                              alt="Gold"
                              width={16}
                              height={16}
                              className="inline-block ml-1 align-middle"
                            />
                            <span className="text-sm text-gray-400 ml-2">(loss penalty)</span>
                          </li>
                        ))}

                      {/* Offer Gains */}
                      {game.playerStats
                        .filter(stat => stat.reason === 'offer_gain')
                        .map(stat => (
                          <li key={stat.id}>
                            {stat.username || `Player#${stat.playerId}`}:
                            <span className="text-yellow-400 font-semibold ml-1">+{stat.goldChange}</span>
                            <Image
                              src="/Gold_symbol.webp"
                              alt="Gold"
                              width={16}
                              height={16}
                              className="inline-block ml-1 align-middle"
                            />
                            <span className="text-sm text-gray-400 ml-2">(offer gain)</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* ---------------- Offers ---------------- */}
                {game.offers.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-bold">Offers:</h4>
                    <ul className="list-disc list-inside">
                      {game.offers.map(offer => (
                        <li key={offer.id}>
                          {offer.from_username} offered {offer.target_username} for {offer.offer_amount}
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
    </section>
  )
}
