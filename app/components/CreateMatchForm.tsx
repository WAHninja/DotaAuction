'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react'; // Optional spinner icon

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
      <form
        onSubmit={handleSubmit}
        className="flex flex-col p-6 bg-slate-600/60 text-white rounded-2xl shadow-2xl w-full max-w-5xl mx-auto space-y-6 flex-grow"
      >
      <h2 className="text-3xl font-bold text-yellow-400 text-center">
        Create a Match
      </h2>

      {error && (
        <div className="bg-red-600/20 text-red-300 px-4 py-2 rounded-lg border border-red-500 animate-pulse">
          {error}
        </div>
      )}

      <p className="text-sm text-center">
        Selected {selectedPlayerIds.length} of 4+ players
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {players.map(player => (
          <label
            key={player.id}
            className={`cursor-pointer p-3 rounded-xl text-center border-2 transition-all duration-200 text-sm ${
              selectedPlayerIds.includes(player.id)
                ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                : 'bg-slate-800 border-gray-600 hover:border-orange-400 text-gray-200'
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

      <div className="text-center">
        <button
          type="submit"
          disabled={selectedPlayerIds.length < 4 || isSubmitting}
          className={`mx-auto w-full sm:w-auto px-6 py-3 font-semibold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
            selectedPlayerIds.length < 4 || isSubmitting
              ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
          {isSubmitting ? 'Creating...' : 'Create Match'}
        </button>
      </div>
    </form>
  );
}
