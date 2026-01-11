'use client'

import GameHistoryCard from './GameHistoryCard'

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
  id: number
  createdAt: string
  teamAMembers: string[]
  team1Members: string[]
  winningTeam: 'team_a' | 'team_1' | null
  playerStats: PlayerStat[]
  offers: Offer[]
}

type GameHistoryTimelineProps = {
  games: Game[]
}

export default function GameHistoryTimeline({ games }: GameHistoryTimelineProps) {
  // Sort games newest first
  const sortedGames = games.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <section className="space-y-4">
      {sortedGames.map((game, index) => (
        <GameHistoryCard
          key={game.id}
          game={game}
          highlight={index === 0} // highlight latest game
          defaultExpanded={index === 0} // expand latest game by default
        />
      ))}
    </section>
  )
}
