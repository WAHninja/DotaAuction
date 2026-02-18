'use client';

import { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
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
  useEffect(() => {
    if (user === null) router.push('/');
  }, [user, router]);

  // ---- Data fetchers (stable refs for hooks) --------------------------------
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
  if (!user)        return <div className="p-6 text-center text-gray-300">Redirecting...</div>;
  if (loading)      return <div className="p-6 text-center text-gray-300">Loading match...</div>;
  if (error)        return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  if (!data)        return <div className="p-6 text-center text-gray-300">Match not found.</div>;

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
        />
        <TeamCard
          name="Team A"
          logo="/TeamA.png"
          players={teamA.map(getPlayer).filter(Boolean)}
          teamId="teamA"
          color="from-red-900/40 to-red-800/40"
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
              className="mb-4 p-4 border rounded-lg shadow cursor-pointer"
              onClick={() => setExpandedGameId(isExpanded ? null : game.gameNumber)}
            >
              <h3 className="text-xl font-semibold flex justify-between items-center">
                <span>Game #{game.gameNumber} – {game.status}</span>
                <button className="text-sm">{isExpanded ? 'Hide' : 'Show'} details</button>
              </h3>

              {/* Collapsed summary */}
              {!isExpanded && acceptedOffer && (
                <p className="mt-2 text-sm font-medium">
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
                  <div className="mt-2">
                    <strong>Winner:</strong> {game.winningTeam || 'N/A'}<br />
                    <strong>Team A:</strong> {game.teamAMembers.join(', ')}<br />
                    <strong>Team 1:</strong> {game.team1Members.join(', ')}
                  </div>

                  {game.playerStats.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-bold">Gold changes:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {game.playerStats
                          .filter((s: any) => s.reason === 'win_reward')
                          .map((stat: any) => (
                            <li key={stat.id}>
                              {stat.username ?? `Player#${stat.playerId}`}:
                              <span className="text-green-400 font-semibold ml-1">+{stat.goldChange}</span>
                              <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                              <span className="text-sm text-gray-400 ml-2">(win reward)</span>
                            </li>
                          ))}

                        {game.playerStats
                          .filter((s: any) => s.reason === 'loss_penalty')
                          .map((stat: any) => (
                            <li key={stat.id}>
                              {stat.username ?? `Player#${stat.playerId}`}:
                              <span className="text-red-500 font-semibold ml-1">{stat.goldChange}</span>
                              <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                              <span className="text-sm text-gray-400 ml-2">(loss penalty)</span>
                            </li>
                          ))}

                        {game.playerStats
                          .filter((s: any) => s.reason === 'offer_accepted' || s.reason === 'offer_gain')
                          .map((stat: any) => (
                            <li key={stat.id}>
                              {stat.username ?? `Player#${stat.playerId}`}:
                              <span className="text-blue-400 font-semibold ml-1">+{stat.goldChange}</span>
                              <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                              <span className="text-sm text-gray-400 ml-2">(offer accepted)</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {game.offers.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-bold">Offers:</h4>
                      <ul className="list-disc list-inside">
                        {game.offers.map((offer: any) => (
                          <li key={offer.id}>
                            {offer.fromUsername} offered {offer.targetUsername} for {offer.offerAmount}
                            <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                            {' '}(
                            <span className={`font-semibold ${
                              offer.status === 'accepted' ? 'text-green-500' :
                              offer.status === 'rejected' ? 'text-red-500' :
                              'text-gray-400'
                            }`}>
                              {offer.status}
                            </span>)
                          </li>
                        ))}
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
