'use client';

import { useEffect, useState, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { UserContext } from '@/app/context/UserContext';
import MatchHeader from '@/app/components/MatchHeader';
import TeamCard from '@/app/components/TeamCard';
import WinnerBanner from '@/app/components/WinnerBanner';
import PhaseControls from '@/app/components/PhaseControls';
import GameHistory from '@/app/components/GameHistory';
import { useRealtimeMatchListener } from '@/app/hooks/useRealtimeMatchListener';

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

  // ---------------- Fetch match + history ----------------
  const fetchMatchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [matchRes, historyRes] = await Promise.all([
        fetch(`/api/match/${matchId}`, { cache: 'no-store' }),
        fetch(`/api/match/${matchId}/history`, { cache: 'no-store' }),
      ]);

      if (!matchRes.ok) throw new Error('Failed to fetch match');
      if (!historyRes.ok) throw new Error('Failed to fetch history');

      const matchJson = await matchRes.json();
      const historyJson = await historyRes.json();

      const games = historyJson.history ?? [];
      const latestGame = games[games.length - 1] ?? null;

      setData({ ...matchJson, games, latestGame });
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (user && matchId) fetchMatchData();
  }, [user, matchId]);

  // ---------------- Derived ----------------
  if (!data) return <div className="p-6 text-center">Loading match…</div>;
  const { match, players = [], games = [] } = data;
  const latestGame = data.latestGame ?? games[games.length - 1] ?? null;
  if (!latestGame) return <div className="p-6 text-center">Match not found</div>;

  const currentUserId = user?.id ?? 0;
  const team1 = latestGame.team_1_members ?? [];
  const teamA = latestGame.team_a_members ?? [];

  // ---------------- Realtime listener ----------------
  const latestGameId = latestGame.id ?? latestGame.gameId;
  useRealtimeMatchListener(matchId ?? '', latestGameId, { fetchMatchData, setData });

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
