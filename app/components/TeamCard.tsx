'use client';

type Player = {
  id: number;
  username: string;
  gold: number;
};

interface TeamCardProps {
  teamName: string;
  teamLogo: string;
  players: Player[];
  teamMembers: number[];
}

export default function TeamCard({ teamName, teamLogo, players, teamMembers }: TeamCardProps) {
  const getPlayer = (id: number) => players.find((p) => p.id === id);

  return (
    <div className="bg-gray-900 rounded-2xl shadow-md p-4 flex flex-col items-center">
      <img src={teamLogo} alt={teamName} className="w-16 h-16 mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">{teamName}</h2>
      <ul className="space-y-2">
        {teamMembers.map((pid) => {
          const player = getPlayer(pid);
          if (!player) return null;
          return (
            <li key={pid} className="flex items-center justify-between w-40 text-white">
              <span>{player.username}</span>
              <span className="flex items-center">
                {player.gold}
                <img src="/Gold_symbol.webp" alt="Gold" className="w-4 h-4 ml-1" />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
