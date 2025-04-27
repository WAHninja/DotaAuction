'use client';

import { useEffect, useState } from 'react';

export default function AuctionPhase({ latestGame, players, currentUserId }: any) {
  const [offers, setOffers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const team1: number[] = latestGame?.team_1_members || [];
  const teamA: number[] = latestGame?.team_a_members || [];
  const winningTeam = latestGame?.winning_team;
  const isWinner = winningTeam === 'team_1' ? team1.includes(currentUserId) : teamA.includes(currentUserId);
  const isLoser = !isWinner;

  const myTeam = winningTeam === 'team_1' ? team1 : teamA;
  const offerCandidates = myTeam.filter((pid) => pid !== currentUserId);

  const alreadyAcceptedOffer = offers.find(
    (o) => o.status === 'accepted' && o.target_player_id === currentUserId
  );

  const getPlayer = (id: number) => players.find((p: any) => p.id === id);

  const fetchOffers = async () => {
    try {
      const res = await fetch(`/api/game/offers?id=${latestGame.id}`);
      const result = await res.json();
      setOffers(result.offers || []);
    } catch (err) {
      console.error('Error fetching offers:', err);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [latestGame.id]);

  const handleSubmitOffer = async () => {
    if (!selectedPlayer || !offerAmount) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/game/${latestGame.id}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_player_id: currentUserId,
          target_player_id: Number(selectedPlayer),
          offer_amount: Number(offerAmount),
        }),
      });
      await fetchOffers();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptOffer = async (offerId: number) => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/game/${latestGame.id}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });
      await fetchOffers();
    } catch (err) {
      console.error(err);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="bg-yellow-100 p-6 rounded-2xl shadow-lg mt-6">
      <h3 className="text-xl font-bold mb-4 text-yellow-800">Auction Phase</h3>

      {isWinner && (
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="p-2 rounded border"
            >
              <option value="">Select Teammate</option>
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
              className="p-2 rounded border w-24"
            />
            <button
              onClick={handleSubmitOffer}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              {submitting ? 'Submitting...' : 'Submit Offer'}
            </button>
          </div>
        </div>
      )}

      <div>
        <h4 className="font-semibold mb-2">Offers</h4>
        <ul className="space-y-3">
          {offers.map((offer) => {
            const from = getPlayer(offer.from_player_id);
            const to = getPlayer(offer.target_player_id);
            const canAccept = isLoser && offer.status === 'pending' && !alreadyAcceptedOffer;

            return (
              <li key={offer.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{from?.username}</span>
                  <span className="text-yellow-800">
                    ➔ {to?.username}
                  </span>
                  {isLoser && (
                    <div className="flex items-center">
                      <span>{offer.offer_amount}</span>
                      <img src="/Gold_symbol.webp" alt="Gold" className="w-4 h-4 ml-1" />
                    </div>
                  )}
                </div>
                {canAccept && (
                  <button
                    onClick={() => handleAcceptOffer(offer.id)}
                    disabled={accepting}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded"
                  >
                    {accepting ? 'Accepting...' : 'Accept'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
