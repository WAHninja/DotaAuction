'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type Player = { id: number; username: string };
type Offer = {
  id: number;
  from_player_id: number;
  target_player_id: number;
  offer_amount: number;
  status: 'pending' | 'accepted' | 'rejected';
};
type Game = {
  id: number;
  team_1_members: number[];
  team_a_members: number[];
  winning_team: 'team_1' | 'team_a' | null;
  status: string;
};
type AuctionPhaseProps = {
  latestGame: Game;
  players: Player[];
  currentUserId: number;
  gamesPlayed: number;
  onRefreshMatch?: () => void; // callback to refresh match data
};

export default function AuctionPhase({
  latestGame,
  players,
  currentUserId,
  gamesPlayed,
  onRefreshMatch,
}: AuctionPhaseProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState('');

  const team1 = latestGame.team_1_members || [];
  const teamA = latestGame.team_a_members || [];
  const winningTeam = latestGame.winning_team;

  const isWinner = winningTeam === 'team_1' ? team1.includes(currentUserId) : teamA.includes(currentUserId);
  const isLoser = winningTeam ? !isWinner : false;

  const myTeam = winningTeam === 'team_1' ? team1 : teamA;
  const offerCandidates = myTeam.filter((id) => id !== currentUserId);
  const alreadySubmittedOffer = offers.some((o) => o.from_player_id === currentUserId);
  const alreadyAcceptedOffer = offers.find((o) => o.status === 'accepted' && o.target_player_id === currentUserId);

  const minOffer = 250 + gamesPlayed * 200;
  const maxOffer = 2000 + gamesPlayed * 500;
  const getPlayer = (id: number) => players.find((p) => p.id === id);

  const fetchOffers = async () => {
    try {
      const res = await fetch(`/api/game/offers?id=${latestGame.id}`);
      const data = await res.json();
      setOffers(data.offers || []);
    } catch (err) {
      console.error('Error fetching offers:', err);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [latestGame.id]);

  // Submit an offer (for winners)
  const handleSubmitOffer = async () => {
    if (alreadySubmittedOffer) return alert('You have already submitted an offer for this game.');

    const parsedAmount = Number(offerAmount);
    if (!selectedPlayer || isNaN(parsedAmount) || parsedAmount < minOffer || parsedAmount > maxOffer) {
      return alert(`Select a teammate and enter a valid offer between ${minOffer}-${maxOffer}.`);
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/game/${latestGame.id}/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_player_id: currentUserId,
          target_player_id: Number(selectedPlayer),
          offer_amount: parsedAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error submitting offer');

      setSelectedPlayer('');
      setOfferAmount('');
      fetchOffers();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to submit offer');
    } finally {
      setSubmitting(false);
    }
  };

  // Accept an offer (for losers)
  const handleAcceptOffer = async (offerId: number) => {
    setAccepting(true);
    setMessage('');
    try {
      const res = await fetch(`/api/game/${latestGame.id}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('✅ Offer accepted!');
        fetchOffers(); // refresh offers
        onRefreshMatch?.(); // refresh parent match state
      } else {
        setMessage(data.message || 'Error accepting offer.');
      }
    } catch (err) {
      console.error(err);
      setMessage('Server error accepting offer.');
    } finally {
      setAccepting(false);
    }
  };

  // ----- Subcomponents -----
  const OfferForm = () => (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <select
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
          className="p-2 rounded border w-full sm:w-auto"
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
          min={minOffer}
          max={maxOffer}
          placeholder={`Gold (${minOffer}-${maxOffer})`}
          value={offerAmount}
          onChange={(e) => setOfferAmount(e.target.value)}
          className="p-2 rounded border w-24"
        />

        <button
          onClick={handleSubmitOffer}
          disabled={submitting || alreadySubmittedOffer}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {submitting ? 'Submitting...' : alreadySubmittedOffer ? 'Offer Submitted' : 'Submit Offer'}
        </button>
      </div>
    </div>
  );

  const OfferList = () => (
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
                <span className="text-yellow-800">➔ {to?.username}</span>
                {isLoser && (
                  <div className="flex items-center">
                    <span>{offer.offer_amount}</span>
                    <Image
                      src="/Gold_symbol.webp"
                      alt="Gold"
                      width={16}
                      height={16}
                      className="ml-1 inline-block"
                    />
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
      {message && <p className="mt-2 text-center text-yellow-600 font-semibold">{message}</p>}
    </div>
  );

  // ----- Render -----
  return (
    <div className="bg-yellow-100 p-6 rounded-2xl shadow-lg mt-6">
      <h3 className="text-xl font-bold mb-4 text-yellow-800">Auction Phase</h3>
      {isWinner && <OfferForm />}
      <OfferList />
    </div>
  );
}
