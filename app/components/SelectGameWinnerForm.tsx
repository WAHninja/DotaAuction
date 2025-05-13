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
  const [message, setMessage] = useState('');

  if (!show) return null;

  const handleSubmit = async () => {
    if (!selectedTeam) {
      setMessage('Please select a team.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/game/${gameId}/select-winner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ winningTeamId: selectedTeam }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Game winner selected successfully!');
      } else {
        setMessage(data.error || 'Something went wrong');
      }
    } catch (err) {
      console.error(err);
      setMessage('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative my-8">
      {/* Overflowing Images */}
      <div className="hidden sm:block absolute -left-20 top-1/2 transform -translate-y-1/2 z-0">
        <Image src="/radiantcreeps.png" alt="Radiant Creeps" width={160} height={160} />
      </div>
      <div className="hidden sm:block absolute -right-20 top-1/2 transform -translate-y-1/2 z-0">
        <Image src="/direcreeps.PNG" alt="Dire Creeps" width={160} height={160} />
      </div>

      {/* Main container */}
      <div className="relative z-10 bg-slate-600 bg-opacity-40 p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-cinzel text-gold mb-4 text-center">Select Winning Team</h2>
        <div className="flex flex-col sm:flex-row justify-center gap-6 mb-6">
          <label className="flex items-center gap-2 cursor-pointer text-yellow-400 hover:text-yellow-300 transition">
            <input
              type="radio"
              name="winner"
              value="team_1"
              onChange={() => setSelectedTeam('team_1')}
              className="accent-gold"
            />
            <span className="font-semibold">Team 1</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-yellow-400 hover:text-yellow-300 transition">
            <input
              type="radio"
              name="winner"
              value="team_a"
              onChange={() => setSelectedTeam('team_a')}
              className="accent-gold"
            />
            <span className="font-semibold">Team A</span>
          </label>
        </div>
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-yellow-600 hover:bg-yellow-500 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Winner'}
          </button>
        </div>
        {message && (
          <p className="mt-4 text-center text-sm text-red-400 font-semibold">{message}</p>
        )}
      </div>
    </div>
  );
}
