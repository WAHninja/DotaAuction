'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';

type SelectWinnerFormProps = {
  gameId: number;
  show: boolean;
};

const TEAMS = [
  { id: 'team_1', label: 'Team 1', faction: 'radiant' },
  { id: 'team_a', label: 'Team A', faction: 'dire' },
] as const;

export default function SelectWinnerForm({ gameId, show }: SelectWinnerFormProps) {
  const [selectedTeam, setSelectedTeam] = useState<'team_1' | 'team_a' | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  if (!show) return null;

  const handleSubmit = async () => {
    if (!selectedTeam) { setMessage('Please select a team.'); return; }
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
        setSubmitted(true);
        setMessage('Winner submitted! Updating…');
      } else if (res.status === 409) {
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

      {/* ── Creep artwork ─────────────────────────────────────────────────── */}
      <div className="hidden sm:block absolute left-6 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <Image src="/radiantcreeps.png" alt="Radiant Creeps" width={200} height={200} />
      </div>
      <div className="hidden sm:block absolute right-6 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <Image src="/direcreeps.PNG" alt="Dire Creeps" width={200} height={200} />
      </div>

      {/* ── Form panel ────────────────────────────────────────────────────── */}
      <div className="relative z-10 panel p-8 max-w-md mx-auto text-center">
        <h2 className="font-cinzel text-2xl font-bold text-dota-gold mb-6">
          Select Winning Team
        </h2>

        {/* Team selector */}
        <div className="flex justify-center gap-6 mb-6">
          {TEAMS.map(({ id, label, faction }) => {
            const isSelected = selectedTeam === id;
            const isRadiant  = faction === 'radiant';

            return (
              <label
                key={id}
                className={`flex items-center gap-2.5 cursor-pointer select-none rounded-lg px-5 py-3 border font-barlow font-semibold tracking-wide transition-all ${
                  isDisabled ? 'opacity-40 cursor-not-allowed' : ''
                } ${
                  isSelected
                    ? isRadiant
                      ? 'bg-dota-radiant/15 border-dota-radiant text-dota-radiant-light shadow-radiant'
                      : 'bg-dota-dire/15 border-dota-dire text-dota-dire-light shadow-dire'
                    : 'bg-dota-deep border-dota-border text-dota-text-muted hover:border-dota-border-bright hover:text-dota-text'
                }`}
              >
                <input
                  type="radio"
                  name="winner"
                  value={id}
                  disabled={isDisabled}
                  onChange={() => setSelectedTeam(id)}
                  className="hidden"
                />
                {label}
              </label>
            );
          })}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className={submitted ? 'btn-secondary' : 'btn-primary'}
        >
          {submitted
            ? <><CheckCircle2 className="w-4 h-4" /> Submitted</>
            : loading
            ? 'Submitting…'
            : 'Submit Winner'}
        </button>

        {/* Feedback */}
        {message && (
          <p className={`mt-4 font-barlow text-sm font-semibold ${
            submitted ? 'text-dota-radiant-light' : 'text-dota-dire-light'
          }`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
