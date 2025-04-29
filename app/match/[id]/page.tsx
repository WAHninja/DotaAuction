'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import SelectGameWinnerForm from './SelectGameWinnerForm';
import { Realtime } from 'ably';

interface Player {
  id: number;
  username: string;
  gold: number;
}

interface Offer {
  id: number;
  from_player_id: number;
  target_player_id: number;
  offer_amount: number;
  status: 'pending' | 'accepted' | 'rejected';
}

interface Game {
  id: number;
  status: string;
  winning_team?: 'team_1' | 'team_a';
  team_1_members: number[];
  team_a_members: number[];
}

interface MatchData {
  match: { id: number };
  latestGame: Game;
  players: Player[];
  currentUserId: number;
}

const MatchPage = () => {
  const { id } = useParams();
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<number | ''>('');
  const [offerAmount, setOfferAmount] = useState<number | ''>('');
  const [offers, setOffers] = useState<Offer[]>([]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/match/${id}`);
      if (!res.ok) throw new Error('Failed to fetch match');
      const json: MatchData = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async () => {
    try {
      const res = await fetch(`/api/match/${id}/offers`);
      if (!res.ok) throw new Error('Failed to fetch offers');
      const json: Offer[] = await res.json();
      setOffers(json);
    } catch (err) {
      console.error(err);
    }
  };

useEffect(() => {
  const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);
  const channel = ably.channels.get(`match:${id}`);

  // When winner is selected
  channel.subscribe('winner-selected', async () => {
    console.log('Winner selected event received');
    await fetchData(); // Update game + match state
  });

  // When a new offer is submitted
  channel.subscribe('offer-submitted', async () => {
    console.log('Offer submitted event received');
    if (data?.latestGame?.status === 'Auction pending') {
      await fetchOffers(data.latestGame.id); // Update offers
    }
  });

  // When an offer is accepted
  channel.subscribe('offer-accepted', async () => {
    console.log('Offer accepted event received');
    await fetchData(); // Update game, match, and hide auction phase
  });

  // Optional: When a new game is started
  channel.subscribe('new-game-started', async () => {
    console.log('New game started event received');
    await fetchData(); // Pull fresh state for next round
  });

  return () => {
    channel.unsubscribe();
    ably.close();
  };
}, [id, data?.latestGame?.id]); // re-subscribe if match/game ID changes
  
  useEffect(() => {
    fetchData();
    fetchOffers();
  }, [id]);

  const getPlayer = useCallback(
    (pid: number) => data?.players.find((p) => p.id === pid),
    [data?.players]
  );

  const handleOfferSubmit = async () => {
    if (!selectedPlayer || typeof offerAmount !== 'number') return;
    try {
      const res = await fetch(`/api/match/${id}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlayerId: selectedPlayer, offerAmount }),
      });
      if (res.ok) {
        setSelectedPlayer('');
        setOfferAmount('');
        await fetchOffers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptOffer = async (offerId: number) => {
    try {
      const res = await fetch(`/api/offer/${offerId}/accept`, { method: 'POST' });
      if (res.ok) {
        await fetchOffers();
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || error || !data) {
    return <div className="p-6 text-center text-gray-300">{loading ? 'Loading match...' : error ? `Error: ${error}` : 'Match not found.'}</div>;
  }

  const { latestGame, players, currentUserId } = data;
  const team1 = latestGame.team_1_members.map(getPlayer).filter(Boolean);
  const teamA = latestGame.team_a_members.map(getPlayer).filter(Boolean);

  const isWinner =
    (latestGame.winning_team === 'team_1' && latestGame.team_1_members.includes(currentUserId)) ||
    (latestGame.winning_team === 'team_a' && latestGame.team_a_members.includes(currentUserId));

  const isLoser =
    (latestGame.winning_team === 'team_1' && latestGame.team_a_members.includes(currentUserId)) ||
    (latestGame.winning_team === 'team_a' && latestGame.team_1_members.includes(currentUserId));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">Match #{data.match.id}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Team 1</h2>
          <ul className="space-y-1">
            {team1.map((player) => (
              <li key={player.id} className="bg-gray-800 p-2 rounded-md flex justify-between">
                <span>{player.username}</span>
                <span className="text-yellow-400">{player.gold}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Team A</h2>
          <ul className="space-y-1">
            {teamA.map((player) => (
              <li key={player.id} className="bg-gray-800 p-2 rounded-md flex justify-between">
                <span>{player.username}</span>
                <span className="text-yellow-400">{player.gold}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="text-center">
        <span className="inline-block mt-4 px-4 py-2 rounded-full text-sm font-medium bg-blue-900 text-blue-300">
          Game Status: {latestGame.status}
        </span>
      </div>

      {latestGame.status === 'Auction pending' && latestGame.winning_team && (
        <>
          {isWinner && (
            <div className="bg-gray-800 p-4 rounded-md">
              <h2 className="font-semibold mb-2">Submit Offer</h2>
              <select
                className="w-full mb-2 p-2 rounded-md bg-gray-900 text-white"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(Number(e.target.value))}
              >
                <option value="">Select a teammate</option>
                {(latestGame.winning_team === 'team_1'
                  ? latestGame.team_1_members
                  : latestGame.team_a_members
                )
                  .filter((id) => id !== currentUserId)
                  .map((id) => {
                    const player = getPlayer(id);
                    return (
                      <option key={id} value={id}>
                        {player?.username}
                      </option>
                    );
                  })}
              </select>
              <input
                type="number"
                min={250}
                max={2000}
                className="w-full mb-2 p-2 rounded-md bg-gray-900 text-white"
                placeholder="Offer amount"
                value={offerAmount}
                onChange={(e) => setOfferAmount(Number(e.target.value))}
              />
              <button
                onClick={handleOfferSubmit}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white"
              >
                Submit Offer
              </button>
            </div>
          )}

          <div className="bg-gray-900 p-4 rounded-md">
            <h2 className="font-semibold mb-2">Offers</h2>
            <ul className="space-y-2">
              {offers.map((offer) => {
                const from = getPlayer(offer.from_player_id);
                const to = getPlayer(offer.target_player_id);
                return (
                  <li
                    key={offer.id}
                    className="bg-gray-800 p-2 rounded-md flex justify-between items-center"
                  >
                    <span className="inline-flex items-center gap-1">
                      <strong>{from?.username}</strong> offers{' '}
                      <strong className="text-yellow-400">
                        {isLoser ? offer.offer_amount : '???'}
                      </strong>{' '}
                      <Image src="/gold.svg" alt="gold" width={16} height={16} />{' '}
                      to <strong>{to?.username}</strong>
                    </span>
                    {isLoser && offer.status === 'pending' && (
                      <button
                        onClick={() => handleAcceptOffer(offer.id)}
                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded-md"
                      >
                        Accept
                      </button>
                    )}
                    {offer.status !== 'pending' && (
                      <span
                        className={
                          offer.status === 'accepted'
                            ? 'text-green-400'
                            : 'text-red-400'
                        }
                      >
                        {offer.status}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {latestGame.status === 'Ongoing' && (
        <SelectGameWinnerForm gameId={latestGame.id} refetch={fetchData} />
      )}
    </div>
  );
};

export default MatchPage;
