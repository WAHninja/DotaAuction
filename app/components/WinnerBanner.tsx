'use client';

import { Trophy } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

type WinnerBannerProps = {
  winnerName: string;
};

export default function WinnerBanner({ winnerName }: WinnerBannerProps) {
  const { width, height } = useWindowSize();

  return (
    <>
      {/* Confetti */}
      <Confetti width={width} height={height} numberOfPieces={300} recycle={false} />

      {/* Winner Display */}
      <div className="relative flex flex-col items-center justify-center mt-6 mb-10 px-6 py-10 rounded-2xl shadow-2xl bg-stone500-50 overflow-hidden">

      {/* Background Image Overlay */}
      <img
        src="/rewards_aegis2024.png"
        alt="Aegis of Champions"
        className="absolute top-1/2 left-1/2 w-56 md:w-72 lg:w-80 -translate-x-1/2 -translate-y-1/2 opacity-90 drop-shadow-2xl animate-pulse"
      />

      {/* Semi-transparent Overlay for Contrast */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/30 to-black/60 backdrop-blur-sm rounded-2xl" />

      {/* Foreground Content */}
      <div className="relative z-10 text-center">
        <div className="flex items-center justify-center gap-3 text-yellow-200 text-4xl font-black drop-shadow-md">
          <Trophy className="w-8 h-8 text-yellow-200 drop-shadow" />
          <span>Match Winner</span>
          <Trophy className="w-8 h-8 text-yellow-200 drop-shadow" />
        </div>

        <div className="mt-3 text-white text-2xl font-extrabold underline decoration-yellow-500 px-4 py-1 rounded bg-black/60 inline-block shadow-inner">
          {winnerName}
        </div>

        <p className="mt-2 text-yellow-100 italic font-medium text-sm drop-shadow-sm">
          A champion rises. Glory is yours.
        </p>
      </div>
    </div>
    </>
  );
}
