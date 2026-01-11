import { Gavel, Trophy, Swords } from 'lucide-react'

type GameStatus = 'auction pending' | 'in progress' | 'finished'

export default function MatchHeader({
  matchId,
  gameNumber,
  status,
  winningTeam
}: {
  matchId: string
  gameNumber: number
  status: GameStatus
  winningTeam?: 'team_1' | 'team_a'
}) {
  const statusDisplay: Record<GameStatus, string> = {
    'auction pending': 'Auction Pending',
    'in progress': 'In Progress',
    'finished': 'Finished'
  }

  const getTeamName = (teamId: 'team_1' | 'team_a') =>
    teamId === 'team_1' ? 'Team 1' : 'Team A'

  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-extrabold text-yellow-400 drop-shadow-md mb-2">
        Match #{matchId}
      </h1>

      <div className="flex justify-center">
        <span
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
            status === 'auction pending'
              ? 'bg-yellow-500 text-black'
              : status === 'in progress'
              ? 'bg-blue-500 text-white'
              : 'bg-green-500 text-white'
          }`}
        >
          Game #{gameNumber}

          {status === 'auction pending' && <Gavel className="w-5 h-5" />}
          {status === 'in progress' && <Swords className="w-5 h-5" />}

          <span>{statusDisplay[status]}</span>

          {status === 'auction pending' && winningTeam && (
            <>
              <Trophy className="w-5 h-5 ml-2" />
              Winning Team: {getTeamName(winningTeam)}
            </>
          )}
        </span>
      </div>
    </div>
  )
}
