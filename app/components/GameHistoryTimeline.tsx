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

  return (
    <div className="relative pl-8 space-y-8">
      {/* Vertical timeline line */}
      <div className="absolute left-3 top-0 bottom-0 w-1 bg-gray-700 rounded" />

      {games.map((game) => (
        <div key={game.gameId} className="relative flex group">
          {/* Timeline marker */}
          <div className="absolute -left-5 top-4 w-4 h-4 rounded-full border-2 border-gray-400 bg-[#111] group-hover:bg-yellow-400 transition-colors" />

          <GameHistoryCard
            gameId={game.gameId}
            createdAt={game.createdAt}
            teamAMembers={game.teamAMembers}
            team1Members={game.team1Members}
            winningTeam={game.winningTeam}
            offers={game.offers}
            playerStats={game.playerStats}
            highlight={game.highlight} // pass highlight to style latest game
          />
        </div>
      ))}
    </div>
  )
}
