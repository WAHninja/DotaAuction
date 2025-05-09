import Image from 'next/image';

export default function TeamCard({ name, logo, players, teamId, color }) {
  const gradient = color || 'from-green-700 via-green-600 to-green-600';

  return (
    <div className={`bg-gradient-to-b ${gradient} p-6 rounded-2xl shadow-lg backdrop-opacity-10`}>
      <div className="flex flex-row justify-center mb-4">
        <Image src={logo} alt={`${name} Logo`} width={64} height={64} />
        <h2 className="text-2xl font-semibold ml-4 mt-5">{name}</h2>
      </div>
      <ul className="space-y-2">
        {players.map((p) => (
          <li key={`${teamId}-${p.id}`} className="flex justify-between items-center">
            <span>{p.username || 'Unknown'}</span>
            <span className="flex items-center gap-1">
              {p.gold ?? 0}
              <Image src="/Gold_symbol.webp" alt="Gold" width={16} height={16} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

