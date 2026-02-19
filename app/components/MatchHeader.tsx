import { Gavel, Swords, Trophy } from 'lucide-react';
import type { GameSummary } from '@/types';

export default function MatchHeader({
  matchId,
  latestGame,
  matchWinnerId,
  matchWinnerUsername,
}: {
  matchId: string;
  latestGame: GameSummary;
  matchWinnerId?: number;
  matchWinnerUsername?: string;
}) {
  const { status, winning_team } = latestGame;

  // Badge style per game status
  const badgeClass =
    status === 'auction pending' ? 'badge-gold'    :
    status === 'in progress'     ? 'badge-info'    :
    status === 'finished'        ? 'badge-radiant' :
                                   'badge';

  const statusLabel =
    status === 'auction pending' ? 'Auction Pending' :
    status === 'in progress'     ? 'In Progress'     :
    status === 'finished'        ? 'Finished'        :
                                   status;

  const StatusIcon =
    status === 'auction pending' ? Gavel  :
    status === 'in progress'     ? Swords :
                                   null;

  const winningTeamName = winning_team === 'team_1' ? 'Team 1' : 'Team A';

  return (
    <div className="text-center mb-8 space-y-3">
      {/* Match title */}
      <h1 className="font-cinzel text-4xl font-black text-dota-gold text-glow-gold">
        Match #{matchId}
      </h1>

      {/* Game status pill */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className={badgeClass}>
          {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
          Game #{latestGame.gameNumber ?? latestGame.id}
          <span className="opacity-60 mx-1">·</span>
          {statusLabel}
        </span>

        {/* Winning team callout — shown during auction */}
        {status === 'auction pending' && winning_team && (
          <span className="badge-radiant">
            <Trophy className="w-3.5 h-3.5" />
            {winningTeamName} won
          </span>
        )}

        {/* Match winner — shown when the whole match is done */}
        {matchWinnerId && matchWinnerUsername && (
          <span className="badge-gold">
            <Trophy className="w-3.5 h-3.5" />
            Champion: {matchWinnerUsername}
          </span>
        )}
      </div>
    </div>
  );
}
