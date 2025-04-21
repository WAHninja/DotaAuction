import { useState } from 'react';

type Offer = {
  id: number;
  from_player_id: number;
  from_username: string;
  amount: number;
};

type AcceptOfferSectionProps = {
  matchId: number;
  currentPlayerId: number;
  offers: Offer[];
  show: boolean;
};

export default function AcceptOfferSection({
  matchId,
  currentPlayerId,
  offers,
  show,
}: AcceptOfferSectionProps) {
  const [acceptedOfferId, setAcceptedOfferId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!show || offers.length === 0) return null;

  const handleAccept = async (offerId: number) => {
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/match/${matchId}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      const data = await res.json();
      if (res.ok) {
        setAcceptedOfferId(offerId);
        setMessage('Offer accepted!');
      } else {
        setMessage(data.error || 'Error accepting offer.');
      }
    } catch (err) {
      console.error(err);
      setMessage('Server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border p-4 rounded-xl bg-white shadow-md mt-6">
      <h2 className="text-xl font-bold mb-4">Offers Made To You</h2>

      {offers.map(offer => (
        <div
          key={offer.id}
          className="flex items-center justify-between border-b py-2"
        >
          <div>
            <p>
              <span className="font-semibold">{offer.from_username}</span> offered{' '}
              <span className="text-green-600 font-bold">{offer.amount}</span> gold
            </p>
          </div>

          {acceptedOfferId === offer.id ? (
            <span className="text-sm text-green-600 font-semibold">Accepted</span>
          ) : (
            <button
              onClick={() => handleAccept(offer.id)}
              disabled={!!acceptedOfferId || loading}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Accept
            </button>
          )}
        </div>
      ))}

      {message && <p className="mt-3 text-sm text-red-500">{message}</p>}
    </div>
  );
}
