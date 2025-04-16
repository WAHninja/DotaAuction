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
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg max-w-xl mx-auto mt-4">
      <h2 className="text-2xl mb-4 font-cinzel text-yellow-400">Create Match</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {players.map(player => (
            <label key={player.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                value={player.id}
                checked={selected.includes(player.id)}
                onChange={() => togglePlayer(player.id)}
              />
              <span>{player.username}</span>
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={selected.length < 4}
          className="w-full"
        >
          Create Match
        </button>
      </form>
    </div>
  );
}
