'use client';

import { useState } from 'react';

type Player = {
  id: number;
  username: string;
};

type SubmitOfferFormProps = {
  matchId: number;
  currentPlayerId: number;
  winningTeamMembers: Player[];
  show: boolean;
};

export default function SubmitOfferForm({
  matchId,
  currentPlayerId,
  winningTeamMembers,
  show,
}: SubmitOfferFormProps) {
  const [targetId, setTargetId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const filteredTeammates = winningTeamMembers.filter(p => p.id !== currentPlayerId);

  const handleSubmit = async () => {
  const numAmount = parseInt(amount);

  if (!targetId || isNaN(numAmount) || numAmount < 250 || numAmount > 2000) {
    setMessage('Please enter a valid offer (250–2000) and select a teammate.');
    return;
  }

  setLoading(true);
  setMessage('');

  try {
    const res = await fetch(`/api/match/${matchId}/submit-offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_player_id: targetId,
        offer_amount: numAmount,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage('Offer submitted!');
    } else {
      setMessage(data.error || 'Something went wrong.');
    }
  } catch (err) {
    console.error(err);
    setMessage('Error submitting offer.');
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="border p-4 rounded-xl bg-white shadow-md mt-6">
      <h2 className="text-xl font-bold mb-2">Submit Offer</h2>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Target Teammate</label>
        <select
          className="w-full border px-2 py-1 rounded"
          onChange={e => setTargetId(Number(e.target.value))}
        >
          <option value="">-- Select --</option>
          {filteredTeammates.map(player => (
            <option key={player.id} value={player.id}>
              {player.username}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Offer Amount (250–2000)</label>
        <input
          type="number"
          className="w-full border px-2 py-1 rounded"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          min={250}
          max={2000}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Offer'}
      </button>

      {message && <p className="mt-2 text-sm text-red-500">{message}</p>}
    </div>
  );
}
