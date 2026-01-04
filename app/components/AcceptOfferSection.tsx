'use client';

import { useState } from 'react';
import Image from 'next/image';

type Offer = {
  id: number;
  game_id: number;
  from_player_id: number;
  target_player_id: number;
  offer_amount: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  from_username: string;
};

type AcceptOfferSectionProps = {
  gameId: number; // <-- must be the latestGame.id
  currentPlayerId: number;
  offers: Offer[];
  show: boolean;
  onUpdateOffers?: () => void; // Optional callback to refresh parent state
};

export default function AcceptOfferSection({
  gameId,
  currentPlayerId,
  offers,
  show,
  onUpdateOffers,
}: AcceptOfferSectionProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Only show offers targeted at the current player
  const playerOffers = offers.filter(o => o.target_player_id === currentPlayerId);

  if (!show || playerOffers.length === 0) return null;

  const handleAccept = async (offerId: number) => {
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/game/${gameId}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }), // must send offerId
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('✅ Offer accepted!');
        // Refresh parent state (offers, match data)
        onUpdateOffers?.();
      } else {
        setMessage(data.message || 'Error accepting offer.');
      }
    } catch (err) {
      console.error(err);
      setMessage('Server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border p-4 rounded-2xl bg-gray-800 shadow-lg mt-6 text-white">
      <h2 className="text-xl font-bold mb-4 text-center">Offers Made To You</h2>

      {playerOffers.map((offer) => (
        <div key={offer.id} className="flex items-center justify-between border-b py-2">
          <div>
            <p>
              <span className="font-semibold">{offer.from_username}</span> offered{' '}
              <span className="text-yellow-400 font-bold">{offer.offer_amount}</span>{' '}
              <Image
                src="/Gold_symbol.webp"
                alt="Gold"
                width={16}
                height={16}
                className="inline-block ml-1 align-middle"
              />
            </p>
            <p className="text-xs text-gray-400">Status: {offer.status}</p>
          </div>

          {offer.status === 'pending' ? (
            <button
              onClick={() => handleAccept(offer.id)}
              disabled={loading}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Accepting...' : 'Accept'}
            </button>
          ) : (
            <span
              className={`px-3 py-1 rounded font-semibold ${
                offer.status === 'accepted' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}
            >
              {offer.status === 'accepted' ? 'Accepted' : 'Rejected'}
            </span>
          )}
        </div>
      ))}

      {message && (
        <p className="mt-3 text-center text-yellow-400 font-medium">{message}</p>
      )}
    </div>
  );
}
