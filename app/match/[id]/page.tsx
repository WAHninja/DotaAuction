'use client';

import { useParams } from 'next/navigation';
import { useGameSnapshot } from '@/app/hooks/useGameSnapshot';
import TeamCard from '@/app/components/TeamCard';
import PhaseControls from '@/app/components/PhaseControls';

export default function MatchPage() {
  const params = useParams();
  const matchId = Array.isArray(params.id) ? params.id[0] : params.id ?? null;

  const snapshot = useGameSnapshot(matchId);

  if (!snapshot) {
    return <p className="text-center text-lg mt-20">Loading match…</p>;
  }

  const { team1 = [], teamA = [], players = [], latestGame } = snapshot;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-6">
        <TeamCard
          name="Team 1"
          logo="/team1-logo.png"
          players={team1.map((id: number) => players.find((p: any) => p.id === id) || { id })}
          teamId="team_1"
          color="from-blue-700 via-blue-600 to-blue-500"
        />
        <TeamCard
          name="Team A"
          logo="/teamA-logo.png"
          players={teamA.map((id: number) => players.find((p: any) => p.id === id) || { id })}
          teamId="team_a"
          color="from-red-700 via-red-600 to-red-500"
        />
      </div>

      <PhaseControls
        latestGame={latestGame}
        players={players}
        currentUserId={1} // TODO: replace with actual current user
        gamesPlayed={latestGame?.gameNumber - 1 || 0}
        offers={latestGame?.offers || []}
      />
    </div>
  );
}
