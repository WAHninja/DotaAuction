'use client';

import { useEffect, useState, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

import { UserContext } from '@/app/context/UserContext';
import SelectGameWinnerForm from '@/app/components/SelectGameWinnerForm';
import MatchHeader from '@/app/components/MatchHeader';
import TeamCard from '@/app/components/TeamCard';
import WinnerBanner from '@/app/components/WinnerBanner';
import AuctionPhase from '@/app/components/AuctionPhase';

import { useGameWinnerListener } from '@/app/hooks/useGameWinnerListener';
import { useAuctionListener } from '@/app/hooks/useAuctionListener';

export default function MatchPage() {
  const { id } = useParams();
  const matchId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { user } = useContext(UserContext);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null);

  const [submittingWinner, setSubmittingWinner] = useState(false);
  const [winnerError, setWinnerError] = useState<string | null>(null);

  /* ---------------- Protect Route ---------------- */
  useEffect(() => {
    if (user === null) router.push('/');
  }, [user, router]);

  /* ---------------- Fetch Data ---------------- */
  const fetchMatchData = async () => {
    try {
      const res = await fetch(`/api/match/${matchId}`);
      if (!res.ok) throw new Error('Failed to fetch match data');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGamesPlayed = async () => {
    try {
      const res = await fetch(`/api/match/${matchId}/games-played`);
      const json = await res.json();
      setGamesPlayed(json.gamesPlayed);
    } catch (err) {
      console.error('Failed to fetch games played', err);
    }
  };

  const fetchGameHistory = async () => {
    try {
      const res = await fetch(`/api/match/${matchId}/history`);
      if (!res.ok) throw new Error('Failed to fetch game history');
      const json = await res.json();
      setHistory(json.history || []);
    } catch (err) {
      console.error('Failed to fetch game history:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMatchData();
      fetchGamesPlayed();
      fetchGameHistory();
    }
  }, [matchId, user]);

  /* ---------------- Listeners ---------------- */
  useGameWinnerListener(matchId, () => {
    if (user) {
      fetchMatchData();
      fetchGamesPlayed();
      fetchGameHistory();
    }
  });

  useAuctionListener(
    matchId,
    data?.latestGame?.id || null,
    fetchMatchData,
    undefined,
    fetchGamesPlayed,
    fetchGameHistory
  );

  /* ---------------- Winner Submit ---------------- */
  const handleWinnerSubmit = async (team: 'team_1' | 'team_a') => {
    if (!data?.latestGame?.id) return;

    setSubmittingWinner(true);
    setWinnerError(null);

    try {
      const res = await fetch(
        `/api/game/${data.latestGame.id}/select-winner`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ winning_team: team }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        setWinnerError(result.error || 'Failed to submit winner.');
        return;
      }

      fetchMatchData();
      fetchGamesPlayed();
      fetchGameHistory();
    } catch (err) {
      console.error(err);
      setWinnerError('Server error submitting winner.');
    } finally {
      setSubmittingWinner(false);
    }
  };

  /* ---------------- Guards ---------------- */
  if (!user)
    return <div className="p-6 text-center text-gray-300">Redirecting...</div>;
  if (loading)
    return <div className="p-6 text-center text-gray-300">Loading match...</div>;
  if (error)
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  if (!data)
    return (
      <div className="p-6 text-center text-gray-300">Match not found.</div>
    );

  const { match, latestGame, players, currentUserId } = data;

  const team1: number[] = latestGame?.team_1_members || [];
  const teamA: number[] = latestGame?.team_a_members || [];

  const getPlayer = (id: number) =>
    players.find((p: any) => p.id === id);

  const isAuction = latestGame?.status === 'auction pending';
  const isInProgress = latestGame?.status === 'in progress';

  /* ---------------- Render ---------------- */
  return (
    <>
      {latestGame && (
        <MatchHeader
          matchId={matchId}
          latestGame={latestGame}
          matchWinnerId={match.winner_id}
          matchWinnerUsername={
            players.find((p: any) => p.id === match.winner_id)?.username
          }
        />
      )}

      {latestGame?.status === 'finished' && (
        <WinnerBanner
          winnerName={
            players.find((p: any) => p.id === match.winner_id)?.username
          }
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TeamCard
          name="Team 1"
          logo="/Team1.png"
          players={team1.map(getPlayer)}
          teamId="team1"
          color="from-lime-900/40 to-lime-800/40"
        />
        <TeamCard
          name="Team A"
          logo="/TeamA.png"
          players={teamA.map(getPlayer)}
          teamId="teamA"
          color="from-red-900/40 to-red-800/40"
        />
      </div>

      {isInProgress && (
        <SelectGameWinnerForm
          loading={submittingWinner}
          error={winnerError}
          onSubmit={handleWinnerSubmit}
        />
      )}

      {isAuction && (
        <AuctionPhase
          latestGame={latestGame}
          players={players}
          currentUserId={currentUserId}
          gamesPlayed={gamesPlayed}
        />
      )}

      {/* ---------------- Game History ---------------- */}
      <section className="mt-12">
        <h2 className="text-3xl font-bold mb-6 text-center">Game History</h2>

        {[...history].reverse().map(game => {
          const isExpanded = expandedGameId === game.gameNumber;
          const acceptedOffer = game.offers.find(
            (o: any) => o.status === 'accepted'
          );

          return (
            <div
              key={game.gameNumber}
              className="mb-4 p-4 border rounded-lg shadow cursor-pointer"
              onClick={() =>
                setExpandedGameId(isExpanded ? null : game.gameNumber)
              }
            >
              <h3 className="text-xl font-semibold flex justify-between">
                <span>
                  Game #{game.gameNumber} – {game.status}
                </span>
                <span className="text-sm">
                  {isExpanded ? 'Hide' : 'Show'} details
                </span>
              </h3>

              {!isExpanded && acceptedOffer && (
                <p className="mt-2 text-sm font-medium">
                  {acceptedOffer.fromUsername} traded{' '}
                  {acceptedOffer.targetUsername} for{' '}
                  {acceptedOffer.offerAmount}
                  <Image
                    src="/Gold_symbol.webp"
                    alt="Gold"
                    width={16}
                    height={16}
                    className="inline-block ml-1"
                  />
                </p>
              )}

              {isExpanded && (
                <>
                  <div className="mt-2">
                    <strong>Winner:</strong> {game.winningTeam || 'N/A'}
                    <br />
                    <strong>Team A:</strong> {game.teamAMembers.join(', ')}
                    <br />
                    <strong>Team 1:</strong> {game.team1Members.join(', ')}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
