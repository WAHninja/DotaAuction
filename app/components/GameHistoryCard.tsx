'use client'

import { useState } from 'react'
import Image from 'next/image'

type PlayerStat = {
  id?: number
  playerId: number
  username: string
  goldChange: number
  reason: 'win_reward' | 'offer_gain' | 'loss_penalty' | string
}

type Offer = {
  id: number
  fromUsername: string
  targetUsername: string
  offerAmount: number
  status: 'pending' | 'accepted' | 'rejected'
}

type Game = {
  gameNumber: number
  status: string
  winningTeam: string | null
  teamAMembers: string[]
  team1Members: string[]
  playerStats: PlayerStat[]
  offers: Offer[]
}

type GameHistoryProps = {
  games: Game[]
}

export default function GameHistory({ games }: GameHistoryProps) {
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null)

  return (
    <section className="mt-8">
      <h2 className="text-3xl font-bold mb-6 text-center">Game History</h2>

      {games
        .slice()
        .sort((a, b) => b.gameNumber - a.gameNumber) // Latest game at top
        .map((game) => {
          const isExpanded = expandedGameId === game.gameNumber
          const acceptedOffer = game.offers.find((o) => o.status === 'accepted')

          return (
            <div
              key={game.gameNumber}
              className="mb-4 p-4 border rounded-lg shadow cursor-pointer"
              onClick={() => setExpandedGameId(isExpanded ? null : game.gameNumber)}
            >
              <h3 className="text-xl font-semibold flex justify-between items-center">
                <span>Game #{game.gameNumber} – {game.status}</span>
                <button className="text-sm">{isExpanded ? 'Hide' : 'Show'} details</button>
              </h3>

              {/* Accepted offer summary */}
              {!isExpanded && acceptedOffer && (
                <p className="mt-2 text-sm font-medium">
                  {acceptedOffer.fromUsername} traded {acceptedOffer.targetUsername} for {acceptedOffer.offerAmount}
                  <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                </p>
              )}

              {isExpanded && (
                <>
                  {/* Teams and Winner */}
                  <div className="mt-2">
                    <strong>Winner:</strong> {game.winningTeam || 'N/A'}<br />
                    <strong>Team A:</strong> {game.teamAMembers.join(', ')}<br />
                    <strong>Team 1:</strong> {game.team1Members.join(', ')}
                  </div>

                  {/* Gold Changes */}
                  {game.playerStats.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-bold">Gold changes:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {/* Win Rewards */}
                        {game.playerStats
                          .filter((stat) => stat.reason === 'win_reward')
                          .map((stat) => (
                            <li key={stat.id}>
                              {stat.username || `Player#${stat.playerId}`}: 
                              <span className="text-green-400 font-semibold ml-1">+{stat.goldChange}</span>
                              <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                              <span className="text-sm text-gray-400 ml-2">(win reward)</span>
                            </li>
                          ))}

                        {/* Offer Gains */}
                        {game.playerStats
                          .filter((stat) => stat.reason === 'offer_gain')
                          .map((stat) => (
                            <li key={stat.id}>
                              {stat.username || `Player#${stat.playerId}`}: 
                              <span className="text-yellow-400 font-semibold ml-1">+{stat.goldChange}</span>
                              <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                              <span className="text-sm text-gray-400 ml-2">(offer gain)</span>
                            </li>
                          ))}

                        {/* Loss Penalties */}
                        {game.playerStats
                          .filter((stat) => stat.reason === 'loss_penalty')
                          .map((stat) => (
                            <li key={stat.id}>
                              {stat.username || `Player#${stat.playerId}`}: 
                              <span className="text-red-500 font-semibold ml-1">{stat.goldChange}</span>
                              <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                              <span className="text-sm text-gray-400 ml-2">(loss penalty)</span>
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
                        {game.offers.map((offer) => (
                          <li key={offer.id}>
                            {offer.fromUsername} offered {offer.targetUsername} for {offer.offerAmount}
                            <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" /> (
                            <span className={`font-semibold ${
                              offer.status === 'accepted' ? 'text-green-500' :
                              offer.status === 'rejected' ? 'text-red-500' : 'text-gray-400'
                            }`}>
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
