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
      {/*
        mix-blend-mode: screen knocks out the pure black background on both
        images. This still works now that they sit over the panel rather than
        the page: screen against a black source pixel returns the backdrop
        unchanged, so the panel shows through exactly where the art is black.

        Positioned with left-6 / right-6 rather than left-0 / right-0 so the art
        clears the panel's chamfered corners — .panel uses a clip-path octagon,
        and creeps flush to the edge poke past the cut at the corners. The
        creeps are siblings of the panel, not children, so the clip-path does
        not trim them; the inset has to be deliberate.

        lg, not sm. Two 200px creeps plus the max-w-md form need roughly 850px
        of panel before they stop colliding, which only exists from lg up.
      */}
      <div className="hidden lg:block absolute left-6 top-1/2 -translate-y-1/2 z-20 pointer-events-none select-none">
        <Image
          src="/radiantcreeps.png"
          alt=""
          width={220}
          height={220}
          priority
          sizes="(min-width: 1280px) 220px, 200px"
          className="w-[200px] xl:w-[220px] h-auto"
          style={{ mixBlendMode: 'screen' }}
        />
      </div>
      <div className="hidden lg:block absolute right-6 top-1/2 -translate-y-1/2 z-20 pointer-events-none select-none">
        <Image
          src="/direcreeps.PNG"
          alt=""
          width={220}
          height={220}
          priority
          sizes="(min-width: 1280px) 220px, 200px"
          className="w-[200px] xl:w-[220px] h-auto"
          style={{ mixBlendMode: 'screen' }}
        />
      </div>

      {/*
        ── Form panel ──────────────────────────────────────────────────────
        Full width of the wrapper (the max-w-md moved to the inner content
        below), so the creeps positioned against the wrapper's edges now land
        inside the panel instead of flanking it.

        min-h is what keeps them contained vertically: the form's natural height
        is roughly 240px, so a 220px creep centred on it would graze the top and
        bottom edges. 300px gives the art clear margin on both sides.
      */}
      <div className="relative z-10 panel px-8 py-10 min-h-[300px] flex flex-col justify-center text-center">
        {/* Controls stay at their original width — only the panel widened. */}
        <div className="max-w-md mx-auto w-full">
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
    </div>
  );
}
