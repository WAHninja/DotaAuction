'use client';

import { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, AlertCircle } from 'lucide-react';
import { UserContext } from '@/app/context/UserContext';
import SelectGameWinnerForm from '@/app/components/SelectGameWinnerForm';
import MatchHeader from '@/app/components/MatchHeader';
import TeamCard from '@/app/components/TeamCard';
import WinnerBanner from '@/app/components/WinnerBanner';
import AuctionHouse from '@/app/components/AuctionHouse';
import { useGameWinnerListener } from '@/app/hooks/useGameWinnerListener';
import { useAuctionListener } from '@/app/hooks/useAuctionListener';

export default function MatchPage() {
  const { id } = useParams();
  const matchId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { user } = useContext(UserContext);

  const [data, setData] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gamesPlayed, setGamesPlayed] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null);

  // ---- Protect route -------------------------------------------------------
  // Wait until the session check has finished before redirecting.
  // Without the loading guard, user is null on every first render (including
  // a hard refresh) and the page redirects before auth has a chance to resolve.
  const { loading: authLoading } = useContext(UserContext);
  useEffect(() => {
    if (!authLoading && user === null) router.push('/');
  }, [authLoading, user, router]);

  // ---- Data fetchers -------------------------------------------------------
  const fetchMatchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/match/${matchId}`);
      if (!res.ok) throw new Error('Failed to fetch match data');
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const fetchOffers = useCallback(async (gameId: number) => {
    try {
      const res = await fetch(`/api/game/offers?id=${gameId}`);
      if (!res.ok) throw new Error('Failed to fetch offers');
      const json = await res.json();
      setOffers(json.offers || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchGamesPlayed = useCallback(async () => {
    try {
      const res = await fetch(`/api/match/${matchId}/games-played`);
      const json = await res.json();
      setGamesPlayed(json.gamesPlayed);
    } catch (err) {
      console.error('Failed to fetch games played', err);
    }
  }, [matchId]);

  const fetchGameHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/match/${matchId}/history`);
      if (!res.ok) throw new Error('Failed to fetch game history');
      const json = await res.json();
      setHistory(json.history || []);
    } catch (err) {
      console.error('Failed to fetch game history:', err);
    }
  }, [matchId]);

  // ---- Initial load --------------------------------------------------------
  useEffect(() => {
    if (!user) return;
    fetchMatchData();
    fetchGamesPlayed();
    fetchGameHistory();
  }, [matchId, user, fetchMatchData, fetchGamesPlayed, fetchGameHistory]);

  useEffect(() => {
    if (data?.latestGame?.status === 'auction pending') {
      fetchOffers(data.latestGame.id);
    }
  }, [data, fetchOffers]);

  // ---- Real-time listeners -------------------------------------------------
  const handleWinnerSelected = useCallback(() => {
    fetchMatchData();
    fetchGamesPlayed();
    fetchGameHistory();
  }, [fetchMatchData, fetchGamesPlayed, fetchGameHistory]);

  useGameWinnerListener(matchId, handleWinnerSelected);

  useAuctionListener(
    matchId,
    data?.latestGame?.id ?? null,
    fetchMatchData,
    fetchOffers,
    fetchGameHistory,
    fetchGamesPlayed,
  );

  // ---- Render guards -------------------------------------------------------
  if (!user && authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Redirecting…</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-4 text-slate-300">
          <Loader2 className="w-10 h-10 animate-spin text-yellow-400" />
          <span className="text-lg font-semibold">Loading match…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-slate-800/80 border border-red-500/40 rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-lg font-semibold text-red-300">Something went wrong</p>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); fetchMatchData(); }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-slate-800/80 border border-slate-600 rounded-2xl p-8 flex flex-col items-center gap-3 max-w-sm text-center">
          <p className="text-lg font-semibold text-slate-300">Match not found</p>
          <p className="text-sm text-slate-400">This match may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  const { match, latestGame, players, currentUserId } = data;
  const team1: number[] = latestGame?.team_1_members || [];
  const teamA: number[] = latestGame?.team_a_members || [];
  const getPlayer = (id: number) => players.find((p: any) => p.id === id);

  const isAuction    = latestGame?.status === 'auction pending';
  const isInProgress = latestGame?.status === 'in progress';
  const isFinished   = latestGame?.status === 'finished';

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

      {isFinished && match.winner_id && (
        <WinnerBanner
          winnerName={players.find((p: any) => p.id === match.winner_id)?.username}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TeamCard
          name="Team 1"
          logo="/Team1.png"
          players={team1.map(getPlayer).filter(Boolean)}
          teamId="team1"
          color="from-lime-900/40 to-lime-800/40"
          currentUserId={currentUserId}
        />
        <TeamCard
          name="Team A"
          logo="/TeamA.png"
          players={teamA.map(getPlayer).filter(Boolean)}
          teamId="teamA"
          color="from-red-900/40 to-red-800/40"
          currentUserId={currentUserId}
        />
      </div>

      {isInProgress && (
        <SelectGameWinnerForm gameId={latestGame.id} show />
      )}

      {isAuction && latestGame.winning_team && (
        <AuctionHouse
          matchId={matchId}
          latestGame={latestGame}
          players={players}
          currentUserId={currentUserId}
          offers={offers}
          gamesPlayed={gamesPlayed}
          onOfferSubmitted={() => fetchOffers(latestGame.id)}
          onOfferAccepted={() => {
            fetchMatchData();
            fetchGameHistory();
            fetchGamesPlayed();
          }}
        />
      )}

      {/* ---- Game History ------------------------------------------------- */}
      <section className="mt-12">
        <h2 className="text-3xl font-bold mb-6 text-center">Game History</h2>

        {[...history].reverse().map((game) => {
          const isExpanded = expandedGameId === game.gameNumber;
          const acceptedOffer = game.offers.find((o: any) => o.status === 'accepted');

          return (
            <div
              key={game.gameNumber}
              className="mb-4 p-4 border border-slate-700 rounded-lg shadow bg-slate-800/60 cursor-pointer hover:bg-slate-800/80 transition-colors"
              onClick={() => setExpandedGameId(isExpanded ? null : game.gameNumber)}
            >
              <h3 className="text-xl font-semibold flex justify-between items-center">
                <span>Game #{game.gameNumber} – {game.status}</span>
                <button className="text-sm text-slate-400 hover:text-white transition-colors">
                  {isExpanded ? 'Hide' : 'Show'} details
                </button>
              </h3>

              {/* Collapsed summary */}
              {!isExpanded && acceptedOffer && (
                <p className="mt-2 text-sm font-medium text-slate-300">
                  {acceptedOffer.fromUsername} traded {acceptedOffer.targetUsername} for{' '}
                  {acceptedOffer.offerAmount}
                  <Image
                    src="/Gold_symbol.webp"
                    alt="Gold"
                    width={16}
                    height={16}
                    className="inline-block ml-1 align-middle"
                  />
                </p>
              )}

              {/* Expanded detail */}
              {isExpanded && (
                <>
                  <div className="mt-2 text-sm text-slate-300">
                    <strong className="text-white">Winner:</strong> {game.winningTeam || 'N/A'}<br />
                    <strong className="text-white">Team A:</strong> {game.teamAMembers.join(', ')}<br />
                    <strong className="text-white">Team 1:</strong> {game.team1Members.join(', ')}
                  </div>

                  {game.playerStats.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-bold text-white mb-2">Gold changes:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {game.playerStats
                          .filter((s: any) => s.reason === 'win_reward')
                          .map((stat: any) => (
                            <li key={stat.id}>
                              {stat.username ?? `Player#${stat.playerId}`}:
                              <span className="text-green-400 font-semibold ml-1">+{stat.goldChange}</span>
                              <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                              <span className="text-slate-400 ml-2">(win reward)</span>
                            </li>
                          ))}
                        {game.playerStats
                          .filter((s: any) => s.reason === 'loss_penalty')
                          .map((stat: any) => (
                            <li key={stat.id}>
                              {stat.username ?? `Player#${stat.playerId}`}:
                              <span className="text-red-400 font-semibold ml-1">{stat.goldChange}</span>
                              <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                              <span className="text-slate-400 ml-2">(loss penalty)</span>
                            </li>
                          ))}
                        {game.playerStats
                          .filter((s: any) => s.reason === 'offer_accepted' || s.reason === 'offer_gain')
                          .map((stat: any) => (
                            <li key={stat.id}>
                              {stat.username ?? `Player#${stat.playerId}`}:
                              <span className="text-blue-400 font-semibold ml-1">+{stat.goldChange}</span>
                              <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                              <span className="text-slate-400 ml-2">(offer accepted)</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {game.offers.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-bold text-white mb-2">Offers:</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {game.offers.map((offer: any) => {
                          const isPending = offer.status === 'pending';
                          return (
                            <li key={offer.id}>
                              {offer.fromUsername} offered {offer.targetUsername} for{' '}
                              {isPending ? (
                                // Hide exact amount while offer is still pending —
                                // show tier label to match what players see in the auction
                                <span className={`font-semibold px-1.5 py-0.5 rounded text-xs ${
                                  offer.tierLabel === 'Low'    ? 'bg-blue-500/20 text-blue-300' :
                                  offer.tierLabel === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                  offer.tierLabel === 'High'   ? 'bg-red-500/20 text-red-300' :
                                  'text-slate-400'
                                }`}>
                                  {offer.tierLabel ?? '?'}
                                </span>
                              ) : (
                                <>
                                  {offer.offerAmount}
                                  <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                                </>
                              )}
                              {' '}(
                              <span className={`font-semibold ${
                                offer.status === 'accepted' ? 'text-green-400' :
                                offer.status === 'rejected' ? 'text-red-400' :
                                'text-slate-400'
                              }`}>
                                {offer.status}
                              </span>)
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
