'use client';

import { useParams } from 'next/navigation';
import { useGameSnapshot } from '@/app/hooks/useGameSnapshot';
import TeamCard from '@/app/components/TeamCard';
import PhaseControls from '@/app/components/PhaseControls';

export default function MatchPage() {
  const params = useParams();
  const matchId = Array.isArray(params.id) ? params.id[0] : params.id; // ensure string

  const snapshot = useGameSnapshot(matchId);

  if (!snapshot) {
    return (
      <div className="text-center text-lg mt-20">
        Loading match...
      </div>
    );
  }

  const {
    matchId: snapshotMatchId,
    games = [],
    players = [],
    teamA = [],
    team1 = [],
    winningTeam,
    offers = [],
    currentUserId = 0, // assume comes from session / snapshot
  } = snapshot;

  const latestGame = games[games.length - 1] ?? null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ---------- Teams ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <TeamCard
          name="Team A"
          logo="/teamA.png"
          players={players.filter(p => teamA.includes(p.id))}
          teamId={1}
          color="from-green-700 via-green-600 to-green-500"
        />
        <TeamCard
          name="Team 1"
          logo="/team1.png"
          players={players.filter(p => team1.includes(p.id))}
          teamId={2}
          color="from-red-700 via-red-600 to-red-500"
        />
      </div>

      {/* ---------- Phase Controls ---------- */}
      {latestGame && (
        <PhaseControls
          latestGame={latestGame}
          players={players}
          currentUserId={currentUserId}
          gamesPlayed={games.length}
          offers={offers}
        />
      )}
    </div>
  );
}
