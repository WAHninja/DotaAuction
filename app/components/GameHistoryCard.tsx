'use client'

import { motion } from 'framer-motion'
import { Trophy, Swords, Coins } from 'lucide-react'

type PlayerStat = {
  id: number
  playerId: number
  username: string
  goldChange: number
  status: 'pending' | 'accepted' | 'rejected'
}

type GameHistoryCardProps = {
  gameId: number
  createdAt: string
  teamAMembers: string[]
  team1Members: string[]
  winningTeam: 'team_a' | 'team_1' | null
  offers: Offer[]
  playerStats: PlayerStat[]
}

export default function GameHistoryCard({
  gameId,
  createdAt,
  teamAMembers,
  team1Members,
  winningTeam,
  offers,
  playerStats
}: GameHistoryCardProps) {
  const date = new Date(createdAt).toLocaleString()

  return (
    <motion.div
      className="bg-[#1b1b1b] border border-gray-700 rounded-2xl p-4 shadow-md mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-yellow-400">
          Game #{gameId}
        </h2>
        <span className="text-sm text-gray-400">{date}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <h3 className="font-semibold text-blue-400 mb-1">Team A</h3>
          <ul className="space-y-1">
            {teamAMembers.map((player) => (
              <li
                key={player}
                className={`pl-2 ${winningTeam === 'team_a' ? 'text-green-400' : 'text-gray-300'}`}
              >
                {player}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-red-400 mb-1">Team 1</h3>
          <ul className="space-y-1">
            {team1Members.map((player) => (
              <li
                key={player}
                className={`pl-2 ${winningTeam === 'team_1' ? 'text-green-400' : 'text-gray-300'}`}
              >
                {player}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {winningTeam && (
        <div className="flex items-center gap-2 text-green-400 font-semibold mb-4">
          <Trophy className="w-4 h-4" />
          Winner: {winningTeam === 'team_a' ? 'Team A' : 'Team 1'}
        </div>
      )}

      {offers.length > 0 && (
        <div className="mb-4">
          <h4 className="text-yellow-300 font-semibold mb-1">Offers</h4>
          <ul className="space-y-1 text-sm">
            {offers.map((offer) => (
              <li key={offer.id} className="flex justify-between items-center px-2 py-1 bg-gray-800 rounded">
                <span className="text-gray-300">
                  {offer.from_username} → {offer.target_username}
                </span>
                <span
                  className={`text-sm ${
                    offer.status === 'accepted'
                      ? 'text-green-400'
                      : offer.status === 'rejected'
                      ? 'text-red-400'
                      : 'text-yellow-400'
                  }`}
                >
                  {offer.status === 'pending' ? '?' : offer.offer_amount}g ({offer.status})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {playerStats.length > 0 && (
        <div>
          <h4 className="text-cyan-300 font-semibold mb-1">Gold Changes</h4>
          <ul className="space-y-1 text-sm">
            {playerStats.map((stat) => (
              <li key={stat.id || `${stat.playerId}-${stat.reason}`} className="flex justify-between items-center px-2 py-1 bg-gray-900 rounded">
                <span className="text-gray-300">
                  {/* Display username instead of team */}
                  {stat.username || `Player#${stat.playerId}`} – {stat.reason}
                </span>
                <span className={`font-medium ${stat.goldChange >= 0 ? 'text-green-300' : 'text-red-400'}`}>
                  <Coins className="inline w-4 h-4 mr-1" />
                  {stat.goldChange >= 0 ? '+' : ''}
                  {stat.goldChange}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}
