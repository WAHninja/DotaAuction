// components/AuctionPhase/OfferList.tsx

'use client';

export default function OfferList({ offers, currentUserId, game, isLoser, onOfferAccepted }: {
  offers: any[];
  currentUserId: number;
  game: any;
  isLoser: boolean;
  onOfferAccepted: (offerId: number) => void;
}) {
  const canAccept = isLoser && offers.every((o) => o.status === 'pending');

  const handleAccept = async (offerId: number) => {
    const res = await fetch(`/api/game/${game.match_id}/accept-offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId }),
    });
    const data = await res.json();
    if (res.ok) {
      onOfferAccepted(offerId);
    } else {
      alert(data.message);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg">Offers</h3>
      {offers.length === 0 && <p className="text-sm text-gray-500">No offers yet.</p>}
      {offers.map((offer) => (
        <div
          key={offer.id}
          className={`border p-3 rounded flex justify-between items-center ${
            offer.status === 'accepted' ? 'bg-green-100' : 'bg-white'
          }`}
        >
          <span>
            <strong>Player {offer.from_user_id}</strong> → Player {offer.target_player_id}
          </span>
          {isLoser && <span className="text-blue-700 font-semibold">{offer.offer_amount} Gold</span>}
          {canAccept && (
            <button
              className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={() => handleAccept(offer.id)}
              disabled={offer.status === 'accepted'}
            >
              Accept
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
