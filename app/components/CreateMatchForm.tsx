import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Player {
  id: number;
  username: string;
}

export default function CreateMatchForm() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch('/api/players');
        const data = await res.json();

        if (Array.isArray(data.players)) {
          setPlayers(data.players);
        } else {
          console.error('Invalid response from /api/players:', data);
          setPlayers([]);
        }
      } catch (error) {
        console.error('Failed to load players:', error);
      }
    };

    fetchPlayers();
  }, []);

  const handleCheckboxChange = (playerId: number) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
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

    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        body: JSON.stringify({ playerIds: selectedPlayerIds }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Unknown error occurred');
        console.error('API error:', data);
        return;
      }

      const match = await res.json();
      router.push(`/match/${match.id}`);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 p-4 bg-[#1b1b1b] text-white rounded-xl shadow-lg max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-orange-400">Create a Match</h2>

      {error && (
        <p className="text-red-400 mb-4">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-4">
        {players.map((player) => (
          <label key={player.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              value={player.id}
              checked={selectedPlayerIds.includes(player.id)}
              onChange={() => handleCheckboxChange(player.id)}
              className="accent-orange-500"
            />
            <span className="text-sm">{player.username}</span>
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={selectedPlayerIds.length < 4}
        className={`px-4 py-2 rounded font-bold text-sm ${
          selectedPlayerIds.length < 4
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-orange-500 hover:bg-orange-600'
        }`}
      >
        Create Match
      </button>
    </form>
  );
}
