'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SelectGameWinnerForm from '../../components/SelectGameWinnerForm';

export default function MatchPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [offerAmount, setOfferAmount] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [submitting, setSubmitting] = useState(false);
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

  if (loading) return <div className="p-4">Loading match...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!data) return <div className="p-4">Match not found.</div>;

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

  const handleSubmitOffer = async () => {
    if (!selectedPlayer || !offerAmount) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/game/${latestGame.id}/make-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_player_id: currentUserId,
          target_player_id: Number(selectedPlayer),
          offer_amount: Number(offerAmount),
        }),
      });
      if (!res.ok) throw new Error('Failed to submit offer');
      await fetchOffers(latestGame.id); // refresh offers
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Match #{match.id}</h1>

      {latestGame && (
        <>
          <h2 className="text-xl font-semibold mb-2">Latest Game #{latestGame.id}</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-100 p-4 rounded-xl shadow">
              <h3 className="font-bold text-lg mb-2">Team 1</h3>
              <ul>
                {[...new Set(team1)].map((pid) => {
                  const player = getPlayer(pid);
                  return (
                    <li key={`team1-${pid}`}>
                      {player?.username || 'Unknown'} (Gold: {player?.gold ?? 0})
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="bg-gray-100 p-4 rounded-xl shadow">
              <h3 className="font-bold text-lg mb-2">Team A</h3>
              <ul>
                {[...new Set(teamA)].map((pid) => {
                  const player = getPlayer(pid);
                  return (
                    <li key={`teamA-${pid}`}>
                      {player?.username || 'Unknown'} (Gold: {player?.gold ?? 0})
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Select Winner Form */}
      <SelectGameWinnerForm gameId={latestGame.id} show={isInProgress} />

      {latestGame?.winning_team && (
        <div className="mb-6">
          <p className="text-green-700 font-medium">
            Winning Team: {latestGame.winning_team === 'team_1' ? 'Team 1' : 'Team A'}
          </p>
        </div>
      )}

      {/* Auction Phase */}
      {isAuction && (
        <div className="bg-yellow-100 p-4 rounded-xl shadow">
          <h3 className="text-lg font-semibold mb-4">Auction Phase</h3>

          {isWinner && (
            <div className="mb-4">
              <p className="mb-2 font-medium">Make an offer:</p>
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  className="p-2 rounded border"
                >
                  <option value="">Select teammate</option>
                  {offerCandidates.map((pid) => {
                    const player = getPlayer(pid);
                    return (
                      <option key={pid} value={pid}>
                        {player?.username}
                      </option>
                    );
                  })}
                </select>
                <input
                  type="number"
                  min={250}
                  max={2000}
                  placeholder="Gold amount"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  className="p-2 rounded border w-32"
                />
                <button
                  onClick={handleSubmitOffer}
                  disabled={submitting}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          )}

          {/* Offers table */}
          <h4 className="font-semibold mb-2">Current Offers</h4>
          <ul className="list-disc pl-5">
            {offers.map((offer) => {
              const from = getPlayer(offer.from_player_id);
              const to = getPlayer(offer.target_player_id);
              return (
                <li key={offer.id}>
                  {from?.username} → {to?.username}
                  {isLoser && <> (Offer: {offer.offer_amount} gold)</>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
