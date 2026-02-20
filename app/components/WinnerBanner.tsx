'use client';

import { Trophy } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import Link from 'next/link';

type WinnerBannerProps = {
  winnerName?: string;
};

export default function WinnerBanner({ winnerName }: WinnerBannerProps) {
  const { width, height } = useWindowSize();

  return (
    <>
      <Confetti
        width={width}
        height={height}
        numberOfPieces={300}
        recycle={false}
        colors={['#c8a951', '#dfc06a', '#4a9b3c', '#c0392b', '#e8e0d0']}
      />

      <div className="relative flex flex-col items-center justify-center mt-6 mb-10 rounded-xl overflow-hidden panel border-dota-gold/40 min-h-[260px]">

        {/* Aegis — mix-blend-mode: screen drops the pure-black background so
            the shield and smoke glow through at full fidelity. Sized large
            so it fills the panel as a genuine backdrop rather than a watermark. */}
        <img
          src="/rewards_aegis2024.png"
          alt=""
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 w-[340px] md:w-[420px] -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
          style={{ mixBlendMode: 'screen' }}
        />

        {/* Centre vignette — adds just enough darkness directly behind the
            text so it stays legible without dimming the shield edges. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 55% 50% at 50% 50%, rgba(13,17,23,0.55) 0%, transparent 100%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center space-y-3 py-12 px-8">

          <div className="flex items-center justify-center gap-3">
            <Trophy className="w-6 h-6 text-dota-gold" />
            <h2 className="font-cinzel text-4xl font-black text-dota-gold text-glow-gold">
              {winnerName ?? 'Champion'}
            </h2>
            <Trophy className="w-6 h-6 text-dota-gold" />
          </div>

          <p className="font-barlow text-sm text-dota-text-muted italic tracking-wide">
            A champion rises. Glory is yours.
          </p>

          <div className="divider-gold w-32 mx-auto" />

          <Link href="/">
            <button className="btn-ghost text-xs px-4 py-1.5 mt-1">
              Back to Dashboard
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}
