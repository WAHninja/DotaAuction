'use client';

import { Trophy } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import Link from 'next/link';

type WinnerBannerProps = {
  winnerName: string;
};

export default function WinnerBanner({ winnerName }: WinnerBannerProps) {
  const { width, height } = useWindowSize();

  return (
    <>
      <Confetti width={width} height={height} numberOfPieces={300} recycle={false} />

      <div className="relative flex flex-col items-center justify-center mt-6 mb-10 px-6 py-10 rounded-2xl overflow-visible">

        <img
          src="/rewards_aegis2024.png"
          alt="Aegis of Champions"
          className="absolute top-[60%] left-1/2 w-56 md:w-72 lg:w-80 -translate-x-1/2 -translate-y-1/2 opacity-90 drop-shadow-2xl animate-pulse"
        />

        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center gap-3 text-yellow-200 text-4xl font-black drop-shadow-md mb-2">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <span>{winnerName}</span>
            <Trophy className="w-8 h-8 text-yellow-400" />
          </div>

          <p className="mt-2 text-yellow-100 italic font-medium text-sm drop-shadow-sm mb-6">
            A champion rises. Glory is yours.
          </p>

          <Link href="/dashboard">
            <button className="mt-4 px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl shadow-lg transition-all duration-200">
              Back to Dashboard
            </button>
          </Link>
        </div>

      </div>
    </>
  );
}
