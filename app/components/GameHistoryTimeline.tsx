import { useState } from 'react'
import GameHistoryCard from './GameHistoryCard'

type TimelineGame = {
  gameId: number
  createdAt: string
  teamAMembers: string[]
  team1Members: string[]
  winningTeam: 'team_a' | 'team_1' | null
  offers: any[]
  playerStats: any[]
  highlight?: boolean
}

type Props = {
  games: TimelineGame[]
}

export default function GameHistoryTimeline({ games }: Props) {
  if (!Array.isArray(games)) return null

  // By default, latest game (first in array) is expanded
  const [expandedGameId, setExpandedGameId] = useState<number | null>(
    games[0]?.gameId ?? null
  )

  const toggleGame = (id: number) => {
    setExpandedGameId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="relative pl-8 space-y-8">
      {/* Vertical timeline line */}
      <div className="absolute left-3 top-0 bottom-0 w-1 bg-gray-700 rounded" />

      {games.map((game) => {
        const isExpanded = expandedGameId === game.gameId
        return (
          <div key={game.gameId} className="relative flex group">
            {/* Timeline marker */}
            <div className="absolute -left-5 top-4 w-4 h-4 rounded-full border-2 border-gray-400 bg-[#111] group-hover:bg-yellow-400 transition-colors" />

            {/* Game card */}
            <div
              className="w-full cursor-pointer"
              onClick={() => toggleGame(game.gameId)}
            >
              <GameHistoryCard
                gameId={game.gameId}
                createdAt={game.createdAt}
                teamAMembers={game.teamAMembers}
                team1Members={game.team1Members}
                winningTeam={game.winningTeam}
                offers={game.offers}
                playerStats={game.playerStats}
                highlight={game.highlight}
                isExpanded={isExpanded}
              />
            </div>
          </div>
        )
      })}
      <div className="h-4" />
    </div>
  )
}
