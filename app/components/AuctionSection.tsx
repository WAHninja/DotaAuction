// components/AuctionSection.tsx

'use client';

import Image from 'next/image';
import { useState } from 'react';

type Player = {
  id: number;
  username: string;
  gold: number;
};

type Offer = {
  id: number;
  from_player_id: number;
  target_player_id: number;
  offer_amount: number;
  status: string;
};

type Props = {
  currentUserId: number;
  gameId: number;
  players: Player[];
  winningTeam: number[];
  offers: Offer[];
  onSubmitOffer: (targetId: number, amount: number) => Promise<void>;
  onAcceptOffer: (offerId: number) => Promise<void>;
  isSubmitting: boolean;
  isAccepting: boolean;
  message: string | null;
};

export default function AuctionSection({
  currentUserId,
  gameId,
  players,
  winningTeam,
  offers,
  onSubmitOffer,
  onAcceptOffer,
  isSubmitting,
  isAccepting,
  message,
}: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [offerAmount, setOfferAmount] = useState('');

  const isWinner = winningTeam.includes(currentUserId);
  const isLoser = !isWinner;

  const offerCandidates = winningTeam.filter(pid => pid !== currentUserId);
  const getPlayer = (id: number) => players.find(p => p.id === id);

  const alreadySubmittedOffer = offers.some(
    offer => offer.from_player_id === currentUserId
  );

  const alreadyAcceptedOffer = offers.find(
    offer => offer.status === 'accepted' && offer.target_player_id === currentUserId
  );

  const handleSubmit = async () => {
    const amount = parseInt(offerAmount, 10);
    if (!selectedPlayer || isNaN(amount) || amount < 250 || amount > 2000) return;
    await onSubmitOffer(parseInt(selectedPlayer, 10), amount);
    setSelectedPlayer('');
    setOfferAmount('');
  };

  return (
    <div className="bg-slate-600 bg-opacity-40 p-6 rounded-2xl shadow-lg mb-8">
      <h3 className="text-2xl font-bold mb-4 text-center">Auction Phase</h3>

      {/* Offer Form */}
      {isWinner && !alreadySubmittedOffer && (
        <div className="mb-6">
          <p className="font-semibold mb-2 text-center md:text-left">Make an Offer:</p>
          <div className="flex flex-col md:flex-row items-center gap-4 justify-center md:justify-start">
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="px-3 py-2 rounded-lg text-black"
            >
              <option value="">Select Player</option>
              {offerCandidates.map(pid => {
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
              placeholder="Offer Amount (250–2000)"
              className="px-3 py-2 rounded-lg text-black"
            />

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Offer'}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="text-center text-sm text-yellow-300 mb-4">{message}</div>
      )}

      {/* Offers List */}
      {offers.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2 text-center md:text-left">Submitted Offers:</h4>
          <ul className="space-y-3">
            {offers.map((offer) => {
              const fromPlayer = getPlayer(offer.from_player_id);
              const targetPlayer = getPlayer(offer.target_player_id);
              return (
                <li
                  key={offer.id}
                  className={`flex flex-col md:flex-row md:justify-between items-center p-3 rounded-lg ${
                    offer.status === 'accepted'
                      ? 'bg-green-700 text-white'
                      : offer.status === 'rejected'
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-800'
                  }`}
                >
                  <div className="text-sm text-center md:text-left">
                    <span className="font-bold">{fromPlayer?.username}</span> offered{' '}
                    <span className="font-bold">{targetPlayer?.username}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 md:mt-0">
                    {(isLoser || offer.status === 'accepted') && (
                      <>
                        <span>{offer.offer_amount}</span>
                        <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} />
                      </>
                    )}

                    {isLoser && offer.status === 'pending' && !alreadyAcceptedOffer && (
                      <button
                        onClick={() => onAcceptOffer(offer.id)}
                        disabled={isAccepting}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded-lg"
                      >
                        {isAccepting ? 'Accepting...' : 'Accept'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
