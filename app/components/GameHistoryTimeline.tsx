import GameHistoryCard from './GameHistoryCard'
import { getUserMapFromOffers } from '@/lib/getUserMapFromOffers'

const userMap = getUserMapFromOffers(data.history)

const games = data.history.map((game: any) => ({
  gameId: game.game_id,
  createdAt: game.created_at,
  teamAMembers: game.team_a_members.map((id: number) => userMap[id] || `Player ${id}`),
  team1Members: game.team_1_members.map((id: number) => userMap[id] || `Player ${id}`),
  winningTeam: game.winning_team,
  offers: game.offers,
  playerStats: game.gold_changes,
}))

type Props = {
  games: TimelineGame[]
}

export default function GameHistoryTimeline({ games }: Props) {
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
