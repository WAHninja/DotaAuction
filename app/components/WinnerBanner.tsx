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
      <Confetti width={width} height={height} numberOfPieces={300} recycle={true} />

      {/* Winner Display */}
      <div className="flex flex-col items-center justify-center mt-6 mb-8 px-6 py-5 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl shadow-xl border-4 border-yellow-200 animate-pulse">
        <img
          src="/rewards_aegis2024.png"
          alt="Aegis of Champions"
          className="w-24 md:w-32 lg:w-40 mb-4 drop-shadow-xl"
        />
        <div className="flex items-center gap-3 text-white text-4xl font-black drop-shadow-lg">
          <Trophy className="w-9 h-9 text-white drop-shadow" />
          <span className="whitespace-nowrap">🏆 Match Winner:</span>
          <span className="text-black bg-white/80 px-2 py-1 rounded-md underline decoration-2 decoration-yellow-500 shadow-inner">
            {winnerName}
          </span>
          <Trophy className="w-9 h-9 text-white drop-shadow" />
        </div>
        <p className="mt-3 text-white text-sm font-medium italic drop-shadow-sm">
          Congratulations on your victory!
        </p>
      </div>
    </>
  );
}
