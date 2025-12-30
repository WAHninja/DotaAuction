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
        const filtered = Array.isArray(data.players)
          ? data.players.filter((p: Player) =>
              !p.username.toLowerCase().startsWith('ztest')
            )
          : [];
        setPlayers(filtered);
      } catch (err) {
        console.error('Failed to load players:', err);
      }
    };

    fetchPlayers();
  }, []);

  const togglePlayer = (id: number) => {
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: selectedPlayerIds }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create match.');
        return;
      }

      router.push(`/match/${data.id}`);
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 bg-slate-700/60 rounded-xl border border-slate-500 shadow-md max-w-3xl mx-auto space-y-4"
    >
      <h2 className="text-3xl font-bold text-yellow-400 text-center">
        Create Match
      </h2>

      <p className="text-sm text-slate-200 text-center">
        Select <strong>4 or more players</strong> to start a match
      </p>

      {error && (
        <div className="bg-red-600/20 border border-red-500 text-red-300 text-sm px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto pr-1">
        {players.map(player => {
          const selected = selectedPlayerIds.includes(player.id);

          return (
            <label
              key={player.id}
              className={`cursor-pointer px-3 py-2 rounded-lg border text-center text-sm transition ${
                selected
                  ? 'bg-slate-800 border-yellow-400 text-yellow-300'
                  : 'bg-slate-800/60 border-slate-600 text-slate-200 hover:border-yellow-400'
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => togglePlayer(player.id)}
                className="hidden"
              />
              {player.username}
            </label>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2 pt-2">
        <p className="text-xs text-slate-300">
          Selected {selectedPlayerIds.length} / 4+
        </p>

        <button
          type="submit"
          disabled={selectedPlayerIds.length < 4 || isSubmitting}
          className={`px-6 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition ${
            selectedPlayerIds.length < 4 || isSubmitting
              ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
              : 'bg-yellow-400 hover:bg-yellow-500 text-black'
          }`}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Creating Match…' : 'Create Match'}
        </button>
      </div>
    </form>
  );
}
