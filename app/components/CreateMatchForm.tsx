'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateMatchForm() {
  const [players, setPlayers] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/players')
      .then(res => res.json())
      .then(data => setPlayers(data.players));
  }, []);

  const toggleSelection = (id: number) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length < 4) return alert('Select at least 4 players');

    const res = await fetch('/api/matches/create', {
      method: 'POST',
      body: JSON.stringify({ playerIds: selected }),
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    if (res.ok) {
      router.push(`/match/${data.matchId}`);
    } else {
      alert(data.error || 'Failed to create match');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold">Select Players</h2>
      <div className="grid grid-cols-2 gap-2">
        {players.map(player => (
          <label key={player.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selected.includes(player.id)}
              onChange={() => toggleSelection(player.id)}
            />
            <span>{player.username}</span>
          </label>
        ))}
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Create Match
      </button>
    </form>
  );
}
