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

      <div className="relative flex flex-col items-center justify-center mt-6 mb-10 px-6 py-12 rounded-xl overflow-visible panel border-dota-gold/40">

        {/* Aegis backdrop */}
        <img
          src="/rewards_aegis2024.png"
          alt="Aegis of Champions"
          className="absolute top-1/2 left-1/2 w-56 md:w-72 lg:w-80 -translate-x-1/2 -translate-y-1/2 opacity-15 pointer-events-none select-none"
        />

        {/* Content */}
        <div className="relative z-10 text-center space-y-3">

          <div className="flex items-center justify-center gap-3">
            <Trophy className="w-7 h-7 text-dota-gold" />
            <h2 className="font-cinzel text-4xl font-black text-dota-gold text-glow-gold">
              {winnerName ?? 'Champion'}
            </h2>
            <Trophy className="w-7 h-7 text-dota-gold" />
          </div>

          <p className="font-barlow text-sm text-dota-text-muted italic tracking-wide">
            A champion rises. Glory is yours.
          </p>

          <div className="divider-gold w-48 mx-auto" />

          <Link href="/">
            <button className="btn-primary mt-2">
              Back to Dashboard
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}
