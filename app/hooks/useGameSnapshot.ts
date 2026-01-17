'use client';

import { useEffect, useState, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { UserContext } from '@/app/context/UserContext';
import MatchHeader from '@/app/components/MatchHeader';
import TeamCard from '@/app/components/TeamCard';
import WinnerBanner from '@/app/components/WinnerBanner';
import PhaseControls from '@/app/components/PhaseControls';
import GameHistory from '@/app/components/GameHistory';
import { useGameSnapshot } from '@/app/hooks/useGameSnapshot';

export default function MatchPage() {
  const { id } = useParams();
  const matchId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { user } = useContext(UserContext);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------- Protect route ----------------
  useEffect(() => {
    if (user === null) router.push('/');
  }, [user, router]);

  // ---------------- Initial fetch ----------------
  useEffect(() => {
    if (!matchId || !user) return;

    setLoading(true);
    fetch(`/api/match/${matchId}`)
      .then(res => res.json())
      .then(matchJson => {
        setData(matchJson);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [matchId, user]);

  // ---------------- Snapshot listener ----------------
  const snapshot = useGameSnapshot(matchId);
  useEffect(() => {
    if (snapshot) setData(snapshot); // full replace
  }, [snapshot]);

  // ---------------- Derived ----------------
  if (!data) return <div className="p-6 text-center">Loading match…</div>;
  const { match, players = [], games = [] } = data;
  const latestGame = games[games.length - 1] ?? null;
  if (!latestGame) return <div className="p-6 text-center">Match not found</div>;

  const currentUserId = user?.id ?? 0;
  const team1 = latestGame.team_1_members ?? [];
  const teamA = latestGame.team_a_members ?? [];

  // ---------------- Render ----------------
  return (
    <>
      <MatchHeader
        matchId={matchId}
        gameNumber={games.length}
        status={latestGame.status}
        winningTeam={latestGame.winning_team}
      />

      {match?.winner_id && (
        <WinnerBanner
          winnerName={players.find(p => p.id === match.winner_id)?.username}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TeamCard name="Team 1" players={team1.map(id => players.find(p => p.id === id))} />
        <TeamCard name="Team A" players={teamA.map(id => players.find(p => p.id === id))} />
      </div>

      <PhaseControls latestGame={latestGame} players={players} currentUserId={currentUserId} />

      <GameHistory matchId={matchId} initialGames={games} />
    </>
  );
}
