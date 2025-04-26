'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface Player {
  id: number;
  username: string;
}

export default function CreateMatchForm() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch('/api/players');
        const data = await res.json();
        setPlayers(Array.isArray(data.players) ? data.players : []);
      } catch (error) {
        console.error('Failed to load players:', error);
      }
    };
    fetchPlayers();
  }, []);

  const handleCheckboxChange = (playerId: number) => {
    setSelectedPlayerIds(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedPlayerIds.length < 4) {
      setError('Please select at least 4 players.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        body: JSON.stringify({ playerIds: selectedPlayerIds }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unknown error occurred');
        return;
      }

      router.push(`/match/${data.id}`);
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center p-6 min-h-screen">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col w-full max-w-6xl bg-gradient-to-br from-[#1f1f1f] to-[#0d0d0d] text-white rounded-2xl shadow-2xl p-8 space-y-8"
      >
        <h2 className="text-4xl font-extrabold text-orange-400 text-center drop-shadow-lg">
          Create a Match
        </h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded-lg animate-pulse text-center">
            {error}
          </div>
        )}

        <p className="text-sm text-gray-400 text-center">
          {selectedPlayerIds.length} player{selectedPlayerIds.length !== 1 && 's'} selected (minimum 4)
        </p>

        {/* Player Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {players.map(player => (
            <label
              key={player.id}
              className={`cursor-pointer p-4 rounded-xl text-center border-2 transition-all duration-200 text-sm font-semibold ${
                selectedPlayerIds.includes(player.id)
                  ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                  : 'border-gray-600 hover:border-orange-400 hover:bg-orange-400/10'
              }`}
            >
              <input
                type="checkbox"
                value={player.id}
                checked={selectedPlayerIds.includes(player.id)}
                onChange={() => handleCheckboxChange(player.id)}
                className="hidden"
              />
              {player.username}
            </label>
          ))}
        </div>

        {/* Submit Button */}
        <div className="text-center pt-4">
          <button
            type="submit"
            disabled={selectedPlayerIds.length < 4 || isSubmitting}
            className={`w-full sm:w-auto px-8 py-4 font-bold rounded-xl text-lg flex items-center justify-center gap-3 transition-all duration-200 ${
              selectedPlayerIds.length < 4 || isSubmitting
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            {isSubmitting && <Loader2 className="animate-spin w-5 h-5" />}
            {isSubmitting ? 'Creating Match...' : 'Create Match'}
          </button>
        </div>
      </form>
    </div>
  );
}
