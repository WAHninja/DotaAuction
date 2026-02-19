'use client';

import { useState } from 'react';
import Image from 'next/image';

type SelectWinnerFormProps = {
  gameId: number;
  show: boolean;
};

export default function SelectWinnerForm({ gameId, show }: SelectWinnerFormProps) {
  const [selectedTeam, setSelectedTeam] = useState<'team_1' | 'team_a' | null>(null);
  const [loading, setLoading] = useState(false);
  // Once a winner is successfully submitted we lock the form permanently
  // so rapid re-clicks or a second user arriving late can't fire again.
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  if (!show) return null;

  const handleSubmit = async () => {
    if (!selectedTeam) {
      setMessage('Please select a team.');
      return;
    }

    // Prevent double-submit on the client before the first request even returns
    if (loading || submitted) return;

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/game/${gameId}/select-winner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winningTeamId: selectedTeam }),
      });

      const data = await res.json();

      if (res.ok) {
        // Lock the form — the real-time Ably event will update everyone's UI
        setSubmitted(true);
        setMessage('Winner submitted! Updating…');
      } else if (res.status === 409) {
        // Another user or a double-click already submitted — treat as success
        setSubmitted(true);
        setMessage('Winner already selected.');
      } else {
        setMessage(data.error || 'Something went wrong.');
      }
    } catch {
      setMessage('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || submitted;

  return (
    <div className="relative my-8">
      {/* Overflowing images */}
      <div
        className="hidden sm:block absolute left-10 transform -translate-y-1/2 z-20"
        style={{ top: 'calc(50% - 5px)' }}
      >
        <Image src="/radiantcreeps.png" alt="Radiant Creeps" width={220} height={220} />
      </div>
      <div
        className="hidden sm:block absolute right-10 transform -translate-y-1/2 z-20"
        style={{ top: 'calc(50% - 5px)' }}
      >
        <Image src="/direcreeps.PNG" alt="Dire Creeps" width={220} height={220} />
      </div>

      <div className="relative z-10 bg-slate-600 bg-opacity-40 p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-cinzel text-gold mb-4 text-center">Select Winning Team</h2>

        <div className="flex flex-col sm:flex-row justify-center gap-6 mb-6">
          {(['team_1', 'team_a'] as const).map((team) => (
            <label
              key={team}
              className={`flex items-center gap-2 cursor-pointer transition ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'text-yellow-400 hover:text-yellow-300'
              }`}
            >
              <input
                type="radio"
                name="winner"
                value={team}
                disabled={isDisabled}
                onChange={() => setSelectedTeam(team)}
                className="accent-gold"
              />
              <span className="font-semibold">{team === 'team_1' ? 'Team 1' : 'Team A'}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={isDisabled}
            className="bg-yellow-600 hover:bg-yellow-500 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting…' : submitted ? 'Submitted ✓' : 'Submit Winner'}
          </button>
        </div>

        {message && (
          <p className={`mt-4 text-center text-sm font-semibold ${
            submitted ? 'text-green-400' : 'text-red-400'
          }`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
