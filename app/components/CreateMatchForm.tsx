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
    fetch('/api/players')
      .then(res => res.json())
      .then(data => {
        setPlayers(Array.isArray(data.players) ? data.players : []);
      })
      .catch(err => console.error('Failed to load players:', err));
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
        setError(data.error || 'Failed to create or rejoin match.');
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

  const enoughSelected = selectedPlayerIds.length >= 4;

  return (
    <form onSubmit={handleSubmit} className="panel h-full flex flex-col p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="text-center space-y-1">
        <h2 className="font-cinzel text-3xl font-bold text-dota-gold">
          Select Players
        </h2>
        <div className="divider-gold" />
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="font-barlow text-sm text-dota-dire-light bg-dota-dire-subtle border border-dota-dire-border rounded px-4 py-2.5">
          {error}
        </div>
      )}

      {/* ── Player grid ────────────────────────────────────────────────────── */}
      <div className="text-center space-y-1">
        <p className="font-barlow text-sm text-dota-text-muted">
          Select <span className="text-dota-text font-semibold">4 or more players</span> to start or continue a match
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto pr-1 flex-1">
        {players.map(player => {
          const selected = selectedPlayerIds.includes(player.id);
          return (
            <label
              key={player.id}
              className={`cursor-pointer px-3 py-2.5 rounded border text-center font-barlow font-semibold text-sm tracking-wide transition-all select-none ${
                selected
                  ? 'bg-dota-overlay border-dota-gold text-dota-gold shadow-gold'
                  : 'bg-dota-deep border-dota-border text-dota-text-muted hover:border-dota-border-bright hover:text-dota-text'
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

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3 pt-1">
        <p className="stat-label">
          {selectedPlayerIds.length} selected
          {!enoughSelected && (
            <span className="text-dota-text-dim normal-case font-normal">
              {' '}· need {4 - selectedPlayerIds.length} more
            </span>
          )}
        </p>

        <button
          type="submit"
          disabled={!enoughSelected || isSubmitting}
          className="btn-primary min-w-[160px]"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Creating…' : 'Play'}
        </button>
      </div>

    </form>
  );
}
