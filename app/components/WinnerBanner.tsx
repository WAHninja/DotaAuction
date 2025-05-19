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
      <div className="flex flex-col items-center justify-center mt-6 mb-8 px-6 py-4 bg-gradient-to-br from-yellow-400 via-orange-400 to-red-500 rounded-xl shadow-2xl animate-pulse border-4 border-yellow-300">
        <div className="flex items-center gap-2 text-white text-3xl font-extrabold drop-shadow">
          <Trophy className="w-8 h-8 text-white drop-shadow" />
          🏆 Match Winner:&nbsp;
          <span className="text-black underline decoration-white decoration-2">{winnerName}</span>
          <Trophy className="w-8 h-8 text-white drop-shadow" />
        </div>
        <p className="mt-2 text-white font-semibold text-sm">Congratulations on your victory!</p>
      </div>
    </>
  );
}
