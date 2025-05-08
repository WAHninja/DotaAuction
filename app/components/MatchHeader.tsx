import { Gavel, PlayCircle, CheckCircle, Trophy } from 'lucide-react';

export default function MatchHeader({ matchId, latestGame }) {
  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-extrabold text-yellow-400 drop-shadow-md mb-2">
        Match #{matchId}
      </h1>
      <div className="flex justify-center">
        <span
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
            latestGame.status === 'Auction pending'
              ? 'bg-yellow-500 text-black'
              : latestGame.status === 'In progress'
              ? 'bg-blue-500 text-white'
              : latestGame.status === 'Finished'
              ? 'bg-green-500 text-white'
              : 'bg-gray-500 text-white'
          }`}
        >
          Game #{latestGame.id}
          {latestGame.status === 'Auction pending' && <Gavel className="w-4 h-4" />}
          {latestGame.status === 'In progress' && <PlayCircle className="w-4 h-4" />}
          {latestGame.status === 'Finished' && <CheckCircle className="w-4 h-4" />}
          {latestGame.status}
          {latestGame?.winning_team && latestGame.status === 'Auction pending' && (
            <>
              <Trophy className="w-4 h-4 ml-2" />
              Winning Team: {latestGame.winning_team === 'team_1' ? 'Team 1' : 'Team A'}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
