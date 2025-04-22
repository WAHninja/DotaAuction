// components/AuctionPhase/WinnerForm.tsx

'use client';

import { useState } from 'react';

export default function WinnerForm({ gameId, teamMembers, currentUserId, onOfferSubmitted }: {
  gameId: number;
  teamMembers: number[];
  currentUserId: number;
  onOfferSubmitted: (offer: any) => void;
}) {
  const [targetId, setTargetId] = useState<number | null>(null);
  const [amount, setAmount] = useState(250);
  const [loading, setLoading] = useState(false);
  const teammates = teamMembers.filter((id) => id !== currentUserId);

  const handleSubmit = async () => {
    if (!targetId || amount < 250 || amount > 2000) return;

    setLoading(true);
    const res = await fetch(`/api/game/${gameId}/submit-offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerAmount: amount, targetPlayerId: targetId }),
    });
    const data = await res.json();
    if (res.ok) {
      onOfferSubmitted(data.offer);
    } else {
      alert(data.message);
    }
    setLoading(false);
  };

  return (
    <div className="border p-4 rounded-xl bg-gray-50 space-y-2">
      <h3 className="font-semibold text-lg">Submit Offer</h3>
      <select
        className="w-full border rounded p-2"
        value={targetId ?? ''}
        onChange={(e) => setTargetId(Number(e.target.value))}
      >
        <option value="">Select a teammate</option>
        {teammates.map((id) => (
          <option key={id} value={id}>Player {id}</option>
        ))}
      </select>
      <input
        type="number"
        className="w-full border rounded p-2"
        value={amount}
        min={250}
        max={2000}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? 'Submitting...' : 'Submit Offer'}
      </button>
    </div>
  );
}
