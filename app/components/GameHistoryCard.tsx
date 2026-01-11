'use client'

import { motion } from 'framer-motion'
import { Trophy, Coins } from 'lucide-react'

type PlayerStat = {
  id?: number
  playerId: number
  username: string
  goldChange: number
  reason: 'win_reward' | 'loss_penalty' | 'offer_accepted' | string
}

type Offer = {
  id: number
  from_username: string
  target_username: string
  offer_amount: number
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
  highlight?: boolean
}

/* ---------------- Subcomponents ---------------- */
const TeamList = ({
  members,
  isWinner,
  teamName
}: {
  members: string[]
  isWinner: boolean
  teamName: string
}) => (
  <div>
    <h3 className={`font-semibold mb-2 text-lg ${isWinner ? 'text-green-400' : 'text-gray-300'}`}>
      {teamName} {isWinner && <Trophy className="inline w-5 h-5 ml-1" />}
    </h3>
    <ul className="space-y-1 max-h-48 overflow-y-auto">
      {members.map((player) => (
        <li
          key={player}
          className={`truncate ${isWinner ? 'text-green-300 font-semibold' : 'text-gray-300'}`}
          title={player}
        >
          {player}
        </li>
      ))}
    </ul>
  </div>
)

const OfferList = ({ offers }: { offers: Offer[] }) => {
  const sorted = [...offers].sort((a, b) => {
    if (a.status === 'accepted') return -1
    if (b.status === 'accepted') return 1
    return 0
  })

  return (
    <div className="bg-gray-900 p-3 rounded-lg shadow-inner">
      <h4 className="text-yellow-300 font-semibold mb-2">Offers</h4>
      <ul className="space-y-1">
        {sorted.map((o) => (
          <li
            key={o.id}
            className={`flex justify-between items-center px-2 py-1 rounded ${
              o.status === 'accepted'
                ? 'bg-green-900'
                : o.status === 'rejected'
                ? 'bg-red-900'
                : 'bg-gray-800'
            }`}
          >
            <span className="truncate max-w-[140px]" title={`${o.from_username} → ${o.target_username}`}>
              {o.from_username} → {o.target_username}
            </span>
            <span
              className={`text-sm font-medium ${
                o.status === 'accepted'
                  ? 'text-green-400'
                  : o.status === 'rejected'
                  ? 'text-red-400'
                  : 'text-yellow-400'
              }`}
            >
              {o.status === 'pending' ? '?' : `${o.offer_amount}g`} ({o.status})
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const GoldChangeList = ({ playerStats }: { playerStats: PlayerStat[] }) => (
  <div className="bg-gray-900 p-3 rounded-lg shadow-inner">
    <h4 className="text-cyan-300 font-semibold mb-2">Gold Changes</h4>
    <ul className="space-y-1">
      {playerStats.map((stat) => (
        <li
          key={stat.id || `${stat.playerId}-${stat.reason}`}
          className="flex justify-between items-center px-2 py-1 rounded bg-gray-800"
        >
          <span className="truncate max-w-[140px]" title={stat.username || `Player#${stat.playerId}`}>
            {stat.username || `Player#${stat.playerId}`} –{' '}
            {stat.reason === 'win_reward'
              ? 'Win Bonus'
              : stat.reason === 'loss_penalty'
              ? 'Loss Penalty'
              : stat.reason === 'offer_accepted'
              ? 'Offer Accepted'
              : stat.reason}
          </span>
          <span className={`flex items-center font-medium ${stat.goldChange >= 0 ? 'text-green-300' : 'text-red-400'}`}>
            <Coins className="w-4 h-4 mr-1" />
            {stat.goldChange >= 0 ? '+' : ''}
            {stat.goldChange}
          </span>
        </li>
      ))}
    </ul>
  </div>
)

/* ---------------- Main Component ---------------- */
export default function GameHistoryCard({
  gameId,
  createdAt,
  teamAMembers,
  team1Members,
  winningTeam,
  offers,
  playerStats,
  highlight = false
}: GameHistoryCardProps) {
  const date = new Date(createdAt).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short'
  })

  return (
    <motion.div
      className={`
        bg-[#1a1a1a] border rounded-2xl p-6 shadow-md mb-6
        ${highlight ? 'border-yellow-400 bg-yellow-50/10' : 'border-gray-700'}
        hover:shadow-xl transition-all duration-300
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-yellow-400">Game #{gameId}</h2>
        <span className="text-sm text-gray-400">{date}</span>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
        <TeamList members={teamAMembers} isWinner={winningTeam === 'team_a'} teamName="Team A" />
        <TeamList members={team1Members} isWinner={winningTeam === 'team_1'} teamName="Team 1" />
      </div>

      {/* Winner Banner */}
      {winningTeam && (
        <div className="flex items-center gap-2 text-green-400 font-semibold mb-4">
          <Trophy className="w-5 h-5" />
          Winner: {winningTeam === 'team_a' ? 'Team A' : 'Team 1'}
        </div>
      )}

      {/* Offers & Gold */}
      {(offers.length > 0 || playerStats.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offers.length > 0 && <OfferList offers={offers} />}
          {playerStats.length > 0 && <GoldChangeList playerStats={playerStats} />}
        </div>
      )}
    </motion.div>
  )
}
