import GameHistoryCard from './GameHistoryCard'

type TimelineGame = {
  gameId: number
  createdAt: string
  teamAMembers: string[]
  team1Members: string[]
  winningTeam: 'team_a' | 'team_1' | null
  offers: any[]
  playerStats: any[]
}

type Props = {
  games: TimelineGame[]
}

export default function GameHistoryTimeline({ games }: Props) {
  if (!Array.isArray(games)) return null;

  return (
    <div className="relative border-l-2 border-gray-600 pl-6 space-y-8">
      {games.map((game, index) => (
        <div key={game.gameId} className="relative group">
          {/* Timeline marker */}
          <div className="absolute -left-[11px] top-3 w-4 h-4 rounded-full border-2 border-gray-300 bg-[#111] group-hover:bg-yellow-400 transition-colors" />

          <GameHistoryCard
            gameId={game.gameId}
            createdAt={game.createdAt}
            teamAMembers={game.teamAMembers}
            team1Members={game.team1Members}
            winningTeam={game.winningTeam}
            offers={game.offers}
            playerStats={game.playerStats}
          />
        </div>
      ))}
    </div>
  )
}
