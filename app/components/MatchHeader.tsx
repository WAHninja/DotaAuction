import { Gavel, Trophy, Swords } from 'lucide-react';

type Game = {
  id: number;
  status: 'auction pending' | 'in progress' | 'finished';
  winning_team?: 'team_1' | 'team_a';
};

export default function MatchHeader({
  matchId,
  latestGame,
  matchWinnerId,
  matchWinnerUsername,
}: {
  matchId: string;
  latestGame: Game;
  matchWinnerId?: number;
  matchWinnerUsername?: string;
}) {
  const statusDisplay = {
    'auction pending': 'Auction Pending',
    'in progress': 'In Progress',
    'finished': 'Finished',
  };

  const getTeamName = (teamId: 'team_1' | 'team_a') =>
    teamId === 'team_1' ? 'Team 1' : 'Team A';

  console.log({
    matchId,
    latestGameStatus: latestGame.status,
    matchWinnerId,
    matchWinnerUsername,
  });

  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-extrabold text-yellow-400 drop-shadow-md mb-2">
        Match #{matchId}
      </h1>
      <div className="flex justify-center">
        <span
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
            latestGame.status === 'auction pending'
              ? 'bg-yellow-500 text-black'
              : latestGame.status === 'in progress'
              ? 'bg-blue-500 text-white'
              : latestGame.status === 'finished'
              ? 'bg-green-500 text-white'
              : 'bg-gray-500 text-white'
          }`}
        >
          Game #{latestGame.id}
          {latestGame.status === 'auction pending' && <Gavel className="w-6 h-6" />}
          {latestGame.status === 'in progress' && <Swords className="w-6 h-6" />}
          
          <span>{statusDisplay[latestGame.status]}</span>

          {latestGame.status === 'auction pending' && latestGame.winning_team && (
            <>
              <Trophy className="w-6 h-6 ml-2" />
              Winning Team: {getTeamName(latestGame.winning_team)}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
