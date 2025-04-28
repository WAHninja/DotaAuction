'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import SelectGameWinnerForm from '../../components/SelectGameWinnerForm';

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

  // WebSocket connection
  useEffect(() => {
    const socket = new WebSocket(`ws://your-websocket-url.com/match/${id}`);

    socket.onopen = () => {
      console.log('WebSocket connection established');
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'offer_update') {
        // Update offers when a new offer is made
        setOffers((prevOffers) => [...prevOffers, message.offer]);
      } else if (message.type === 'game_status_update') {
        // Update game status or auction phase when it changes
        setData((prevData: any) => ({
          ...prevData,
          latestGame: message.latestGame,
        }));
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error: ', error);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    // Clean up WebSocket connection when component unmounts
    return () => {
      socket.close();
    };
  }, [id]);

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
      {/* Back button */}
      <div className="mb-6">
        <Link href="/dashboard">
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl">
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

      {/* Auction Section */}
      {isAuction && !alreadyAcceptedOffer && (
        <div className="bg-gray-700 p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold text-yellow-400">Auction Phase</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="offer-amount" className="block text-gray-300">
                Offer Amount (250-2000)
              </label>
              <input
                type="number"
                id="offer-amount"
                className="w-full mt-2 p-3 rounded-md"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                disabled={submitting}
                min={250}
                max={2000}
              />
            </div>

            <div>
              <label htmlFor="target-player" className="block text-gray-300">
                Select Player to Offer
              </label>
              <select
                id="target-player"
                className="w-full mt-2 p-3 rounded-md"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                disabled={submitting}
              >
                <option value="">Select a player</option>
                {offerCandidates.map((pid) => {
                  const player = getPlayer(pid);
                  return (
                    <option key={pid} value={pid}>
                      {player?.username || 'Unknown'}
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              onClick={handleSubmitOffer}
              disabled={submitting || !offerAmount || !selectedPlayer}
              className={`mt-4 w-full bg-yellow-500 hover:bg-yellow-400 text-black py-2 rounded-xl font-semibold ${
                submitting || !offerAmount || !selectedPlayer ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Offer'}
            </button>
          </div>
        </div>
      )}

      {/* Offers */}
      {isAuction && offers.length > 0 && (
        <div className="mt-8 bg-gray-700 p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold text-yellow-400">Offers</h3>
          <ul className="space-y-4">
            {offers.map((offer) => (
              <li
                key={offer.id}
                className={`flex justify-between items-center ${offer.status === 'accepted' ? 'bg-green-500' : ''}`}
              >
                <span>
                  Offer by {getPlayer(offer.from_user_id)?.username}: {offer.offer_amount} Gold
                </span>
                {isLoser && (
                  <button
                    onClick={() => handleAcceptOffer(offer.id)}
                    disabled={accepting || offer.status === 'accepted'}
                    className={`px-4 py-2 rounded-xl ${
                      offer.status === 'accepted' ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-400'
                    }`}
                  >
                    {accepting ? 'Accepting...' : 'Accept Offer'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Game Winner Selection */}
      {isWinner && <SelectGameWinnerForm gameId={latestGame.id} />}
    </div>
  );
}
