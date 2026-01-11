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
