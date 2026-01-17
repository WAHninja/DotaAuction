import Image from 'next/image';

type Player = {
  id: number;
  username?: string;
  gold?: number;
};

interface TeamCardProps {
  name: string;
  logo?: string;
  players: Player[];
  teamId?: string | number; // ✅ allow string or number
  color?: string;
}

export default function TeamCard({
  name,
  logo = '/default-logo.png',
  players = [],
  teamId = 'team',
  color = 'from-green-700 via-green-600 to-green-600',
}: TeamCardProps) {
  return (
    <div
      className={`bg-gradient-to-b ${color} p-6 rounded-2xl shadow-lg backdrop-opacity-10`}
    >
      <div className="flex flex-row justify-center mb-4 items-center">
        {logo && (
          <Image src={logo} alt={`${name} Logo`} width={100} height={100} />
        )}
        <h2 className="text-2xl font-semibold ml-4">{name}</h2>
      </div>
      <ul className="space-y-2">
        {players.map((p) => (
          <li
            key={`${teamId}-${p.id}`} // ✅ now works with number
            className="flex justify-between items-center"
          >
            <span>{p.username ?? `Player#${p.id}`}</span>
            <span className="flex items-center gap-1">
              {p.gold ?? 0}
              <Image
                src="/Gold_symbol.webp"
                alt="Gold"
                width={16}
                height={16}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
