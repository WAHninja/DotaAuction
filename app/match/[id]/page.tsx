'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import SelectGameWinnerForm from '../../components/SelectGameWinnerForm';
import MobileNavToggle from '../../components/MobileNavToggle';

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
    if (!selectedPlayer || !offerAmount) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/game/${data.latestGame.id}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPlayerId: Number(selectedPlayer),
          offerAmount: Number(offerAmount),
        }),
      });

      if (!res.ok) throw new Error('Failed to submit offer');
      await fetchOffers(data.latestGame.id); // Refresh offers
      setSelectedPlayer('');
      setOfferAmount('');
    } catch (err) {
      console.error(err);
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

      {/* Offers Section */}
      {isAuction && !alreadyAcceptedOffer && (
        <div className="bg-gray-800 p-6 rounded-xl mb-8">
          <h3 className="text-xl font-semibold text-yellow-400 mb-4">Submit Your Offer</h3>
          <div className="mb-4">
            <label htmlFor="player" className="block text-gray-300">Select a Player:</label>
            <select
              id="player"
              className="w-full mt-2 p-2 rounded-md bg-gray-700 text-gray-200"
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
            >
              <option value="">Choose a player...</option>
              {offerCandidates.map((pid) => {
                const player = getPlayer(pid);
                return (
                  <option key={pid} value={pid}>
                    {player?.username}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="offerAmount" className="block text-gray-300">Offer Amount:</label>
            <input
              id="offerAmount"
              type="number"
              className="w-full mt-2 p-2 rounded-md bg-gray-700 text-gray-200"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              min={250}
              max={2000}
            />
          </div>
          <button
            onClick={handleSubmitOffer}
            disabled={submitting || !selectedPlayer || !offerAmount}
            className="w-full p-3 mt-4 bg-green-500 hover:bg-green-400 text-white rounded-lg"
          >
            {submitting ? 'Submitting...' : 'Submit Offer'}
          </button>
        </div>
      )}

      {/* Accepted Offers */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-yellow-400 mb-4">Offers</h3>
        {offers.length > 0 ? (
          <ul className="space-y-4">
            {offers.map((offer) => (
              <li key={offer.id} className="bg-gray-800 p-4 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-gray-300">{getPlayer(offer.from_user_id)?.username}</span>
                  <span className="text-gray-400">{offer.offer_amount} gold</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{offer.status}</span>
                  {isLoser && offer.status === 'pending' && (
                    <button
                      onClick={() => handleAcceptOffer(offer.id)}
                      disabled={accepting}
                      className="px-4 py-2 mt-2 bg-green-500 text-white rounded-lg"
                    >
                      {accepting ? 'Accepting...' : 'Accept Offer'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">No offers yet.</p>
        )}
      </div>
    </div>
  );
}
