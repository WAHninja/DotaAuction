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
import { useRealtimeMatchListener } from '@/app/hooks/useRealtimeMatchListener';

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

  /* ---------------- Protect Route ---------------- */
  useEffect(() => {
    if (user === null) router.push('/');
  }, [user, router]);

  if (user === undefined) return <div className="p-6 text-center text-gray-300">Loading user...</div>;

  /* ---------------- Fetch Match Data ---------------- */
  const fetchMatchData = async () => {
    try {
      const res = await fetch(`/api/match/${matchId}`);
      if (!res.ok) throw new Error('Failed to fetch match data');
      const json = await res.json();
      setData(json);
      setGamesPlayed(json.gamesPlayed || 0);
      setHistory(json.history || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async (gameId: number) => {
    if (!gameId) return;
    try {
      const res = await fetch(`/api/game/offers?id=${gameId}`);
      const json = await res.json();
      if (data && data.latestGame?.id === gameId) {
        setData((prev: any) => ({
          ...prev,
          latestGame: { ...prev.latestGame, offers: json.offers || [] },
        }));
      }
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    }
  };

  /* ---------------- Realtime Listener ---------------- */
  useRealtimeMatchListener(matchId, data?.latestGame?.id, {
    fetchMatchData,
    fetchOffers,
    fetchGameHistory: () => setHistory((prev) => [...prev]), // refresh history
    fetchGamesPlayed: () => setGamesPlayed(data?.gamesPlayed || 0),
  });

  /* ---------------- Initial Fetch ---------------- */
  useEffect(() => {
    if (user) fetchMatchData();
  }, [matchId, user]);

  /* ---------------- Guards ---------------- */
  if (!user) return <div className="p-6 text-center text-gray-300">Redirecting...</div>;
  if (loading) return <div className="p-6 text-center text-gray-300">Loading match...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  if (!data) return <div className="p-6 text-center text-gray-300">Match not found.</div>;

  const { match, latestGame, players, currentUserId } = data;
  const team1: number[] = latestGame?.team_1_members || [];
  const teamA: number[] = latestGame?.team_a_members || [];

  const getPlayer = (id: number) => players.find((p: any) => p.id === id);

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
          matchWinnerUsername={players.find((p: any) => p.id === match.winner_id)?.username}
        />
      )}

      {latestGame?.status === 'finished' && (
        <WinnerBanner
          winnerName={players.find((p: any) => p.id === match.winner_id)?.username}
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

      {isInProgress && <SelectGameWinnerForm gameId={latestGame.id} />}

      {isAuction && (
        <AuctionPhase
          latestGame={latestGame}
          players={players}
          currentUserId={currentUserId}
          gamesPlayed={gamesPlayed}
          onRefreshMatch={fetchMatchData} // still works for manual refresh
        />
      )}

      {/* ---------------- Game History ---------------- */}
      <section className="mt-12">
        <h2 className="text-3xl font-bold mb-6 text-center">Game History</h2>
        {[...history].reverse().map((game) => {
          const isExpanded = expandedGameId === game.gameNumber;
          const acceptedOffer = game.offers?.find((o: any) => o.status === 'accepted');
          const isLatest = game.gameNumber === data.latestGame?.gameNumber;

          return (
            <div
              key={game.gameNumber}
              ref={isLatest ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : null}
              className={`mb-4 p-4 border rounded-lg shadow cursor-pointer transition-all ${
                isLatest ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 bg-white'
              }`}
              onClick={() => setExpandedGameId(isExpanded ? null : game.gameNumber)}
            >
              <h3 className="text-xl font-semibold flex justify-between">
                <span>
                  Game #{game.gameNumber} – {game.status}
                </span>
                <span className="text-sm">{isExpanded ? 'Hide' : 'Show'} details</span>
              </h3>

              {!isExpanded && acceptedOffer && (
                <p className="mt-2 text-sm font-medium">
                  {acceptedOffer.fromUsername} traded {acceptedOffer.targetUsername} for {acceptedOffer.offerAmount}
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
                <div className="mt-2">
                  <strong>Winner:</strong> {game.winningTeam || 'N/A'}
                  <br />
                  <strong>Team A:</strong> {game.teamAMembers.join(', ')}
                  <br />
                  <strong>Team 1:</strong> {game.team1Members.join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
