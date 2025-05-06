'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import SelectGameWinnerForm from '../../components/SelectGameWinnerForm';
import MobileNavToggle from '../../components/MobileNavToggle';
import { useGameWinnerListener } from '@/app/hooks/useGameWinnerListener';
import { useAuctionListener } from '@/app/hooks/useAuctionListener';


export default function MatchPage() {
  const { id } = useParams();
  const matchId = Array.isArray(id) ? id[0] : id;
  const [data, setData] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [offerAmount, setOfferAmount] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchMatchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/match/${id}`);
      if (!res.ok) throw new Error(`Failed to fetch match data: ${res.statusText}`);
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async (gameId: number) => {
    try {
      const res = await fetch(`/api/game/offers?id=${gameId}`);
      if (!res.ok) throw new Error('Failed to fetch offers');
      const result = await res.json();
      setOffers(result.offers || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMatchData();
  }, [id]);

  useEffect(() => {
    if (data?.latestGame?.status === 'Auction pending') {
      fetchOffers(data.latestGame.id);
    }
  }, [data]);

   useGameWinnerListener(matchId, () => {
  fetchMatchData();
});

  useAuctionListener(
    matchId,
    data?.latestGame?.id || null,
    fetchMatchData,
    fetchOffers
  );

  const handleSubmitOffer = async () => {
    const parsedAmount = parseInt(offerAmount, 10);

    if (!selectedPlayer || isNaN(parsedAmount) || parsedAmount < 250 || parsedAmount > 2000) {
      setMessage('Please select a player and enter a valid offer amount between 250 and 2000.');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const gameId = data?.latestGame?.id;
      if (!gameId) {
        setMessage('Game ID is missing');
        return;
      }

      const res = await fetch(`/api/game/${gameId}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_player_id: parseInt(selectedPlayer, 10),
          offer_amount: parsedAmount,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage('Offer submitted!');
        setOfferAmount('');
        setSelectedPlayer('');
        fetchOffers(gameId); // refresh offers list
      } else {
        setMessage(result.error || 'Something went wrong.');
      }
    } catch (err) {
      console.error('Error submitting offer:', err);
      setMessage('Error submitting offer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptOffer = async (offerId: number) => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/game/${id}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      if (!res.ok) throw new Error('Failed to accept offer');
      await fetchOffers(data.latestGame.id); // Refresh offers
    } catch (err) {
      console.error(err);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-300">Loading match...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  if (!data) return <div className="p-6 text-center text-gray-300">Match not found.</div>;

  const { match, latestGame, players, currentUserId } = data;
  const team1: number[] = latestGame?.team_1_members || [];
  const teamA: number[] = latestGame?.team_a_members || [];

  const getPlayer = (pid: number) => players.find((p: any) => p.id === pid);

  const isInProgress = latestGame?.status === 'In progress';
  const isAuction = latestGame?.status === 'Auction pending';
  const winningTeam = latestGame?.winning_team;

  const isWinner = winningTeam === 'team_1' ? team1.includes(currentUserId) : teamA.includes(currentUserId);
  const isLoser = !isWinner;

  const myTeam = winningTeam === 'team_1' ? team1 : teamA;
  const offerCandidates = myTeam.filter((pid) => pid !== currentUserId);

  const alreadyAcceptedOffer = offers?.find(
    (o) => o.status === 'accepted' && o.target_player_id === currentUserId
  );

  return (
  <>
    {/* Header */}
    <div className="flex justify-center gap-4 flex-wrap text-lg">
  <div className="flex items-center gap-2">
    <span className="text-white">Game #{latestGame.id}</span>
    <span
      className={`px-4 py-1 rounded-full text-sm font-semibold tracking-wide shadow-md border
        ${
          latestGame.status === 'Auction pending'
            ? 'bg-yellow-400 text-black border-yellow-500'
            : latestGame.status === 'In progress'
            ? 'bg-blue-500 text-white border-blue-600'
            : latestGame.status === 'Finished'
            ? 'bg-green-500 text-white border-green-600'
            : 'bg-gray-600 text-white border-gray-500'
        }`}
    >
      {latestGame.status}
    </span>
  </div>

  {latestGame?.winning_team && (
    <span className="px-4 py-1 rounded-full text-sm font-semibold text-lime-300 bg-lime-900 bg-opacity-40 border border-lime-600 shadow-inner">
      Winning Team: {latestGame.winning_team === 'team_1' ? 'Team 1' : 'Team A'}
    </span>
  )}
</div>


    {/* Teams */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
  {/* Team 1 */}
  <div className="bg-gradient-to-b from-[rgba(54,83,20,0.6)] via-[rgba(63,98,18,0.6)] to-[rgba(63,98,18,0.6)] p-6 rounded-2xl shadow-lg backdrop-opacity-10">
    <div className="flex flex-row justify-center mb-4">
      <Image src="/Team1.png" alt="Team 1 Logo" width={64} height={64} />
      <h2 className="text-2xl font-semibold ml-4 mt-5">Team 1</h2>
    </div>
    <ul className="space-y-2">
      {team1.map((pid) => {
        const player = getPlayer(pid);
        return (
          <li key={`team1-${pid}`} className="flex justify-between items-center">
            <span>{player?.username || 'Unknown'}</span>
            <span className="flex items-center gap-1">
              {player?.gold ?? 0}
              <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} />
            </span>
          </li>
        );
      })}
    </ul>
  </div>

  {/* Team A */}
  <div className="bg-gradient-to-b from-[rgba(69,10,10,0.6)] via-[rgba(127,29,29,0.6)] to-[rgba(127,29,29,0.6)] p-6 rounded-2xl shadow-lg backdrop-opacity-10">
    <div className="flex flex-row justify-center mb-4">
      <Image src="/TeamA.png" alt="Team A Logo" width={64} height={64} />
      <h2 className="text-2xl font-semibold ml-4 mt-5">Team A</h2>
    </div>
    <ul className="space-y-2">
      {teamA.map((pid) => {
        const player = getPlayer(pid);
        return (
          <li key={`teamA-${pid}`} className="flex justify-between items-center">
            <span>{player?.username || 'Unknown'}</span>
            <span className="flex items-center gap-1">
              {player?.gold ?? 0}
              <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} />
            </span>
          </li>
        );
      })}
    </ul>
  </div>
</div>

    {/* Select Winner Form */}
    {isInProgress && (
      <div className="mb-8">
        <SelectGameWinnerForm gameId={latestGame.id} show={isInProgress} />
      </div>
    )}

    {/* Auction Phase */}
    {isAuction && (
      <div className="bg-slate-600 bg-opacity-40 p-6 rounded-2xl shadow-lg mb-8">
        <h3 className="text-2xl font-bold mb-4 text-center">Auction Phase</h3>

        {/* Offer form for winners */}
        {isWinner && (
          <div className="mb-6">
            <p className="font-semibold mb-2 text-center">Make an Offer:</p>
            <div className="flex flex-col md:flex-row items-center gap-4 justify-center">
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="px-3 py-2 rounded-lg text-black"
              >
                <option value="">Select Player</option>
                {offerCandidates.map((pid) => {
                  const player = getPlayer(pid);
                  return (
                    <option key={pid} value={pid}>
                      {player?.username || 'Unknown'}
                    </option>
                  );
                })}
              </select>

              <input
                type="number"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="Offer Amount (250-2000)"
                className="px-3 py-2 rounded-lg text-black"
              />

              <button
                onClick={handleSubmitOffer}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                {submitting ? 'Submitting...' : 'Submit Offer'}
              </button>
            </div>
          </div>
        )}

        {/* Current Offers */}
        <div>
          <h4 className="text-xl font-bold mb-2">Current Offers</h4>
          <ul className="space-y-4">
            {offers.map((offer) => {
              const from = getPlayer(offer.from_player_id);
              const to = getPlayer(offer.target_player_id);
              const canAccept = isLoser && offer.status === 'pending' && !alreadyAcceptedOffer;

              return (
                <li
                  key={offer.id}
                  className="flex flex-col md:flex-row items-center justify-between bg-gray-800 p-4 rounded-xl"
                >
                  <span>
                    <strong>{from?.username}</strong> offers <strong className="text-yellow-400">{offer.offer_amount}</strong>
                    <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} className="inline-block ml-1" />
                    to <strong>{to?.username}</strong>
                  </span>
                  {canAccept && (
                    <button
                      onClick={() => handleAcceptOffer(offer.id)}
                      disabled={accepting}
                      className="mt-2 md:mt-0 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                    >
                      {accepting ? 'Accepting...' : 'Accept Offer'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    )}
  </>
);
}
