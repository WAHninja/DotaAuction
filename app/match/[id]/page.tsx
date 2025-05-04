'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import SelectGameWinnerForm from '../../components/SelectGameWinnerForm';
import MobileNavToggle from '../../components/MobileNavToggle';
import ablyClient from '@/lib/ablyClient'; // Use ablyClient here
import Ably from 'ably/promises';
import type { Types } from 'ably';

export default function MatchPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [offerAmount, setOfferAmount] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null); // Adding message state for feedback

  useEffect(() => {
    if (!data?.latestGame?.id) return;

    const channel = ablyClient.channels.get(`match-${id}-offers`); // Use ablyClient here

    const handleOffer = (msg: Types.Message) => {
      const newOffer = msg.data;
      setOffers((prev) => [...prev, newOffer]);
    };

    channel.subscribe('new-offer', handleOffer);

    return () => {
      channel.unsubscribe('new-offer', handleOffer);
      ablyClient.channels.release(`match-${id}-offers`); // Use ablyClient here
    };
  }, [data?.latestGame?.id]);

  useEffect(() => {
    const fetchData = async () => {
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

    fetchData();
  }, [id]);

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
    if (data?.latestGame?.status === 'Auction pending') {
      fetchOffers(data.latestGame.id);
    }
  }, [data]);

  const handleSubmitOffer = async () => {
    const parsedAmount = parseInt(offerAmount, 10);

    if (!selectedPlayer || isNaN(parsedAmount) || parsedAmount < 250 || parsedAmount > 2000) {
      setMessage('Please select a player and enter a valid offer amount between 250 and 2000.');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const gameId = data?.latestGame?.id; // Ensure gameId is taken from the latest game data
      if (!gameId) {
        setMessage('Game ID is missing');
        return;
      }

      const res = await fetch(`/api/game/${gameId}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_player_id: selectedPlayer,
          offer_amount: parsedAmount,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage('Offer submitted!');
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
      const res = await fetch(`/api/match/${id}/accept-offer`, {
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

  const alreadyAcceptedOffer = offers.find(
    (o) => o.status === 'accepted' && o.target_player_id === currentUserId
  );
  
  return (
    <div className="max-w-5xl mx-auto p-6 text-gray-100">
    <MobileNavToggle />
      {/* Back button */}
      <div className="mb-6">
        <Link href="/dashboard">
          <button className="hidden md:inline-block bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl">
            ← Back to Dashboard
          </button>
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-yellow-400 drop-shadow-md mb-2">
          Match #{match.id}
         </h1>
        <p className="text-lg text-gray-400 flex justify-center items-center gap-2">
          Game #{latestGame.id}
          <span
            className={`px-3 py-1 rounded-full text-sm font-bold ${
              latestGame.status === 'Auction pending'
                ? 'bg-yellow-500 text-black'
                : latestGame.status === 'In progress'
                ? 'bg-blue-500'
                : latestGame.status === 'Finished'
                ? 'bg-green-500'
                : 'bg-gray-500'
            }`}
          >
            {latestGame.status}
          </span>
          {latestGame?.winning_team && (
            <span className="px-3 py-1 rounded-full text-sm font-bold text-green-400">
              Winning Team: {latestGame.winning_team === 'team_1' ? 'Team 1' : 'Team A'}
            </span>
          )}
        </p>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Team 1 */}
        <div className="bg-gradient-to-b from-red-900 via-red-800 to-red-700 p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col items-center mb-4">
            <Image src="/Team1.png" alt="Team 1 Logo" width={64} height={64} />
            <h2 className="text-2xl font-semibold mt-2">Team 1</h2>
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
        <div className="bg-gradient-to-b from-blue-900 via-blue-800 to-blue-700 p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col items-center mb-4">
            <Image src="/TeamA.png" alt="Team A Logo" width={64} height={64} />
            <h2 className="text-2xl font-semibold mt-2">Team A</h2>
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
        <div className="bg-yellow-300 bg-opacity-20 p-6 rounded-2xl shadow-lg mb-8">
          <h3 className="text-2xl font-bold mb-4 text-yellow-400 text-center">Auction Phase</h3>

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
    </div>
  );
}
