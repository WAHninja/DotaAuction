import Image from 'next/image';
import type { Player } from '@/types';

type TeamCardProps = {
  name: string;
  logo: string;
  players: Player[];
  teamId: string;
  color?: string;
  currentUserId?: number;
};

export default function TeamCard({ name, logo, players, teamId, color, currentUserId }: TeamCardProps) {
  const gradient = color || 'from-green-700 via-green-600 to-green-600';

  return (
    <div className={`bg-gradient-to-b ${gradient} p-6 rounded-2xl shadow-lg backdrop-opacity-10`}>
      <div className="flex flex-row justify-center mb-4">
        <Image src={logo} alt={`${name} Logo`} width={100} height={100} />
        <h2 className="text-2xl font-semibold ml-4 mt-10">{name}</h2>
      </div>
      <ul className="space-y-2">
        {players.map((p) => {
          const isYou = currentUserId !== undefined && p.id === currentUserId;

          return (
            <li
              key={`${teamId}-${p.id}`}
              className={`flex justify-between items-center rounded-lg px-2 py-1 transition-colors ${
                isYou
                  ? 'bg-yellow-400/15 border border-yellow-400/40'
                  : ''
              }`}
            >
              <span className={`flex items-center gap-2 ${isYou ? 'text-yellow-300 font-bold' : ''}`}>
                {p.username || 'Unknown'}
                {isYou}
              </span>
              <span className="flex items-center gap-1">
                {p.gold ?? 0}
                <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
