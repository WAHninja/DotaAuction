'use client';

import { useEffect, useState, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { UserContext } from '@/app/context/UserContext';
import SelectGameWinnerForm from '@/app/components/SelectGameWinnerForm';
import MatchHeader from '@/app/components/MatchHeader';
import TeamCard from '@/app/components/TeamCard';
import WinnerBanner from '@/app/components/WinnerBanner';
import { useGameWinnerListener } from '@/app/hooks/useGameWinnerListener';
import { useAuctionListener } from '@/app/hooks/useAuctionListener';

export default function MatchPage() {
  const { id } = useParams();
  const matchId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { user } = useContext(UserContext);

  const [data, setData] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [offerAmount, setOfferAmount] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gamesPlayed, setGamesPlayed] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null);

  // ------------------ Protect Route ------------------
  useEffect(() => {
    if (user === null) {
      router.push('/');
    }
  }, [user, router]);

  // ------------------ Fetch Data ------------------
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

  const fetchOffers = async (gameId: number) => {
    try {
      const res = await fetch(`/api/game/offers?id=${gameId}`);
      if (!res.ok) throw new Error('Failed to fetch offers');
      const json = await res.json();
      setOffers(json.offers || []);
    } catch (err) {
      console.error(err);
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

  useEffect(() => {
    if (data?.latestGame?.status === 'auction pending') {
      fetchOffers(data.latestGame.id);
    }
  }, [data]);

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
    fetchOffers,
    fetchGamesPlayed,
    fetchGameHistory
  );

  // ------------------ Offer Handlers ------------------
  const handleSubmitOffer = async () => {
    if (!data?.latestGame?.id) return;
    const parsedAmount = parseInt(offerAmount, 10);
    const minOfferAmount = 250 + gamesPlayed * 200;
    const maxOfferAmount = 2000 + gamesPlayed * 500;

    if (!selectedPlayer || isNaN(parsedAmount) || parsedAmount < minOfferAmount || parsedAmount > maxOfferAmount) {
      alert(`Please select a player and enter a valid offer (${minOfferAmount}-${maxOfferAmount})`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/game/${data.latestGame.id}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_player_id: parseInt(selectedPlayer), offer_amount: parsedAmount }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error submitting offer');

      setOfferAmount('');
      setSelectedPlayer('');
      fetchOffers(data.latestGame.id);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to submit offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptOffer = async (offerId: number) => {
    if (!data?.latestGame?.id) return;
    setAccepting(true);

    try {
      const res = await fetch(`/api/game/${matchId}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      if (!res.ok) throw new Error('Failed to accept offer');

      await fetchOffers(data.latestGame.id);
    } catch (err) {
      console.error(err);
    } finally {
      setAccepting(false);
    }
  };

  // ------------------ Render ------------------
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
  const winningTeam = latestGame?.winning_team;

  // Auction logic helpers
  const isWinner =
    winningTeam === 'team_1'
      ? team1.includes(currentUserId)
      : winningTeam === 'team_a'
      ? teamA.includes(currentUserId)
      : false;

  const isLoser = winningTeam ? !isWinner : false;
  const myTeam = isWinner ? (winningTeam === 'team_1' ? team1 : teamA) : [];
  const offerCandidates = myTeam.filter((id) => id !== currentUserId);
  const alreadySubmittedOffer = offers.some(o => o.from_player_id === currentUserId);
  const alreadyAcceptedOffer = offers.find(o => o.status === 'accepted' && o.target_player_id === currentUserId);
  const allOffersSubmitted = myTeam.every(pid => offers.some(o => o.from_player_id === pid));
  const minOfferAmount = 250 + gamesPlayed * 200;
  const maxOfferAmount = 2000 + gamesPlayed * 500;

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
        <WinnerBanner winnerName={players.find((p: any) => p.id === match.winner_id)?.username} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TeamCard name="Team 1" logo="/Team1.png" players={team1.map(getPlayer)} teamId="team1" color="from-lime-900/40 to-lime-800/40" />
        <TeamCard name="Team A" logo="/TeamA.png" players={teamA.map(getPlayer)} teamId="teamA" color="from-red-900/40 to-red-800/40" />
      </div>

      {isInProgress && <SelectGameWinnerForm gameId={latestGame.id} show={isInProgress} />}

      {/* ------------------ Auction Phase ------------------ */}
      {isAuction && (
        <div className="bg-slate-600 bg-opacity-40 p-6 rounded-2xl shadow-lg mb-8">
          <h3 className="text-2xl font-bold mb-4 text-center">Auction House</h3>

          {isWinner && !alreadySubmittedOffer && (
            <div className="w-full max-w-md mx-auto mb-6">
              <p className="font-semibold mb-2 text-center">Make an Offer:</p>
              <div className="text-sm text-gray-300 text-center mb-2">
                Offer must be between <span className="font-semibold text-white">{minOfferAmount}</span> and <span className="font-semibold text-white">{maxOfferAmount}</span>
                <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4 justify-center">
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  className="px-3 py-2 rounded-lg text-black w-full max-w-xs"
                >
                  <option value="">Select Player</option>
                  {offerCandidates.map((pid) => {
                    const player = getPlayer(pid);
                    return <option key={pid} value={pid}>{player?.username || 'Unknown'}</option>;
                  })}
                </select>

                <input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder={`${minOfferAmount}-${maxOfferAmount}`}
                  min={minOfferAmount}
                  max={maxOfferAmount}
                  className="px-3 py-2 rounded-lg text-black w-full max-w-xs"
                />
              </div>

              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleSubmitOffer}
                  disabled={submitting || !selectedPlayer || !offerAmount || Number(offerAmount) < minOfferAmount || Number(offerAmount) > maxOfferAmount}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg w-full max-w-xs"
                >
                  {submitting ? 'Submitting...' : 'Submit Offer'}
                </button>
              </div>
            </div>
          )}

          {isWinner && alreadySubmittedOffer && (
            <div className="w-full max-w-md mx-auto mb-6 text-center text-yellow-300 font-semibold">
              ✅ You've already submitted your offer.
            </div>
          )}

          {/* Current Offers for Losing Team */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1">
              <h4 className="text-xl font-bold text-center mb-4">Current Offers</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {offers.map((offer) => {
                  const from = getPlayer(offer.from_player_id);
                  const to = getPlayer(offer.target_player_id);
                  const canAccept = isLoser && offer.status === 'pending' && !alreadyAcceptedOffer && allOffersSubmitted;

                  return (
                    <div key={offer.id} className="bg-gray-800 p-4 rounded-2xl shadow-lg border border-gray-700 flex flex-col justify-between h-full">
                      <div className="flex flex-col gap-2 mb-4">
                        <div className="flex gap-2">
                          <span className="text-lg text-gray-300">From</span>
                          <span className="text-lg font-semibold text-yellow-300">{from?.username}</span>
                        </div>
                        <div className="mt-2 text-sm text-gray-300">
                          {allOffersSubmitted ? `Offer: ${offer.offer_amount} ` : 'Waiting for all offers'}
                          {allOffersSubmitted && <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />}
                        </div>
                      </div>
                      {canAccept && (
                        <button onClick={() => handleAcceptOffer(offer.id)} disabled={accepting} className="mt-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                          {accepting ? 'Accepting...' : 'Accept Offer'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------ Game History ------------------ */}
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

              {!isExpanded && acceptedOffer && (
                <p className="mt-2 text-sm font-medium">
                  {acceptedOffer.fromUsername} traded {acceptedOffer.targetUsername} for {acceptedOffer.offerAmount}
                  <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                </p>
              )}

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
                        {game.playerStats.map((stat: any) => (
                          <li key={stat.id}>
                            {stat.username || `Player#${stat.playerId}`}:
                            <span className={`ml-1 font-semibold ${stat.reason === 'win_reward' ? 'text-green-400' : 'text-red-500'}`}>
                              {stat.goldChange}
                            </span>
                            <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" />
                            <span className="text-sm text-gray-400 ml-2">({stat.reason})</span>
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
                            <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1 align-middle" /> (
                            <span className={`font-semibold ${offer.status === 'accepted' ? 'text-green-500' : offer.status === 'rejected' ? 'text-red-500' : 'text-gray-400'}`}>
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
