'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Player = {
  id: number;
  username: string;
};

export default function CreateMatchForm() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch('/api/players');
        const data = await res.json();
        setPlayers(data.players);
      } catch (err) {
        console.error('Error loading players:', err);
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
    if (selectedPlayerIds.length < 4) {
      alert('Please select at least 4 players.');
      return;
    }

    const res = await fetch('/api/matches/create', {
      method: 'POST',
      body: JSON.stringify({ playerIds: selectedPlayerIds }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/match/${data.matchId}`);
    } else {
      alert('Failed to create match');
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg mt-8">
      <h2 className="text-xl font-bold mb-4">Create Match</h2>
      <form onSubmit={handleSubmit}>
        {players.length === 0 ? (
          <p>Loading players...</p>
        ) : (
          <div className="space-y-2">
            {players.map((player) => (
              <label key={player.id} className="block">
                <input
                  type="checkbox"
                  value={player.id}
                  onChange={() => handleCheckboxChange(player.id)}
                  checked={selectedPlayerIds.includes(player.id)}
                  className="mr-2"
                />
                {player.username}
              </label>
            ))}
          </div>
        )}
        <button
          type="submit"
          className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white disabled:opacity-50"
          disabled={selectedPlayerIds.length < 4}
        >
          Create Match
        </button>
      </form>
    </div>
  );
}
