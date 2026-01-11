'use client'

import { useState } from 'react'
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
  defaultExpanded?: boolean
}

/* ---------------- Subcomponents ---------------- */
const TeamList = ({ members, isWinner, teamName, color }: { members: string[], isWinner: boolean, teamName: string, color: string }) => (
  <div>
    <h3 className={`font-semibold mb-1 ${color}`}>
      {teamName} {isWinner && <Trophy className="inline w-4 h-4 text-green-400 ml-1" />}
    </h3>
    <ul className="space-y-1 max-h-40 overflow-y-auto">
      {members.map(player => (
        <li key={player} className={`pl-2 truncate ${isWinner ? 'text-green-400 font-semibold' : 'text-gray-300'}`} title={player}>
          {player}
        </li>
      ))}
    </ul>
  </div>
)

const OfferList = ({ offers }: { offers: Offer[] }) => {
  const sortedOffers = [...offers].sort((a, b) => (a.status === 'accepted' ? -1 : b.status === 'accepted' ? 1 : 0))
  return (
    <div className="bg-gray-800 p-2 rounded-lg shadow-inner max-h-48 overflow-y-auto">
      <h4 className="text-yellow-300 font-semibold mb-2">Offers</h4>
      <ul className="space-y-1">
        {sortedOffers.map(offer => (
          <li key={offer.id} className="flex justify-between items-center px-2 py-1 bg-gray-900 rounded">
            <span className="text-gray-300 truncate max-w-[120px]" title={`${offer.from_username} → ${offer.target_username}`}>
              {offer.from_username} → {offer.target_username}
            </span>
            <span className={`text-sm ${
              offer.status === 'accepted' ? 'text-green-400' :
              offer.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {offer.status === 'pending' ? '?' : offer.offer_amount}g ({offer.status})
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const GoldChangeList = ({ playerStats }: { playerStats: PlayerStat[] }) => (
  <div className="bg-gray-800 p-2 rounded-lg shadow-inner max-h-48 overflow-y-auto">
    <h4 className="text-cyan-300 font-semibold mb-2">Gold Changes</h4>
    <ul className="space-y-1">
      {playerStats.map(stat => (
        <li key={stat.id || `${stat.playerId}-${stat.reason}`} className="flex justify-between items-center px-2 py-1 bg-gray-900 rounded">
          <span className="text-gray-300 truncate max-w-[120px]" title={stat.username || `Player#${stat.playerId}`}>
            {stat.username || `Player#${stat.playerId}`} – {stat.reason === 'win_reward' ? 'Win Bonus' : stat.reason === 'loss_penalty' ? 'Loss Penalty' : stat.reason === 'offer_accepted' ? 'Offer Accepted' : stat.reason}
          </span>
          <span className={`font-medium ${stat.goldChange >= 0 ? 'text-green-300' : 'text-red-400'}`}>
            <Coins className="inline w-4 h-4 mr-1" />{stat.goldChange >= 0 ? '+' : ''}{stat.goldChange}
          </span>
        </li>
      ))}
    </ul>
  </div>
)

/* ---------------- Main Component ---------------- */
export default function GameHistoryCard({ gameId, createdAt, teamAMembers, team1Members, winningTeam, offers, playerStats, highlight, defaultExpanded = false }: GameHistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const date = new Date(createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })

  // Collapsed summary
  const totalGoldChange = playerStats.reduce((sum, s) => sum + s.goldChange, 0)
  const acceptedOffersCount = offers.filter(o => o.status === 'accepted').length

  return (
    <motion.div
      className={`bg-[#1b1b1b] border rounded-2xl p-4 shadow-md mb-4 transition-all cursor-pointer ${
        highlight ? 'border-yellow-400 bg-yellow-50' : 'border-gray-700'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => setIsExpanded(prev => !prev)}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-yellow-400">Game #{gameId}</h2>
        <span className="text-sm text-gray-400">{date}</span>
      </div>

      {/* Collapsed summary */}
      {!isExpanded && (
        <div className="text-gray-400 italic mb-2 text-sm flex justify-between">
          <span>{winningTeam ? `Winner: ${winningTeam === 'team_a' ? 'Team A' : 'Team 1'}` : 'No winner yet'}</span>
          <span>{acceptedOffersCount > 0 ? `${acceptedOffersCount} accepted offer${acceptedOffersCount > 1 ? 's' : ''}` : 'No accepted offers'}</span>
          <span>Total Gold Change: {totalGoldChange >= 0 ? '+' : ''}{totalGoldChange}</span>
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <>
          {/* Teams */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
            <TeamList members={teamAMembers} isWinner={winningTeam === 'team_a'} teamName="Team A" color="text-blue-400" />
            <TeamList members={team1Members} isWinner={winningTeam === 'team_1'} teamName="Team 1" color="text-red-400" />
          </div>

          {/* Winner */}
          {winningTeam && (
            <div className="flex items-center gap-2 text-green-400 font-semibold mb-4">
              <Trophy className="w-4 h-4" />
              Winner: {winningTeam === 'team_a' ? 'Team A' : 'Team 1'}
            </div>
          )}

          {/* Offers + Gold Changes */}
          {(offers.length > 0 || playerStats.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offers.length > 0 && <OfferList offers={offers} />}
              {playerStats.length > 0 && <GoldChangeList playerStats={playerStats} />}
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
