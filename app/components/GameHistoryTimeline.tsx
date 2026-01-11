import GameHistoryCard from './GameHistoryCard'

type TimelineGame = {
  gameId: number
  createdAt: string
  teamAMembers: string[]
  team1Members: string[]
  winningTeam: 'team_a' | 'team_1' | null
  offers: any[]
  playerStats: any[]
  status?: 'in-progress' | 'finished' | 'auction pending'
}

type Props = {
  games: TimelineGame[]
}

export default function GameHistoryTimeline({ games }: Props) {
  if (!Array.isArray(games) || games.length === 0) return null

  return (
    <div className="relative border-l-2 border-gray-600 pl-8 space-y-10">
      {games.map((game, index) => {
        const isLatest = index === games.length - 1

        return (
          <div key={game.gameId} className="relative group">
            {/* Timeline marker */}
            <div
              className={`
                absolute -left-5 top-4 w-6 h-6 rounded-full border-2
                border-gray-400 ${isLatest ? 'bg-yellow-400 animate-pulse' : 'bg-gray-800'}
                shadow-md
              `}
            />

            {/* Connecting line */}
            {index < games.length - 1 && (
              <div className="absolute left-[-9px] top-10 h-full w-0.5 bg-gray-600" />
            )}

            {/* Game Card */}
            <GameHistoryCard
              gameId={game.gameId}
              createdAt={game.createdAt}
              teamAMembers={game.teamAMembers}
              team1Members={game.team1Members}
              winningTeam={game.winningTeam}
              offers={game.offers}
              playerStats={game.playerStats}
              highlight={isLatest}
            />
          </div>
        )
      })}
    </div>
  )
}
