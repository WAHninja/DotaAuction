import Image from 'next/image';
import type { Player } from '@/types';

type TeamCardProps = {
  name: string;
  logo: string;
  players: Player[];
  teamId: string;
  faction: 'radiant' | 'dire';
  currentUserId?: number;
};

export default function TeamCard({ name, logo, players, teamId, faction, currentUserId }: TeamCardProps) {
  const isRadiant = faction === 'radiant';

  const nameColour   = isRadiant ? 'text-dota-radiant-light' : 'text-dota-dire-light';
  const youBg        = isRadiant
    ? 'bg-dota-radiant/15 border border-dota-radiant/40'
    : 'bg-dota-dire/15 border border-dota-dire/40';
  const youText      = isRadiant ? 'text-dota-radiant-light' : 'text-dota-dire-light';
  const youBadgeBg   = isRadiant
    ? 'bg-dota-radiant/20 text-dota-radiant-light border border-dota-radiant/40'
    : 'bg-dota-dire/20 text-dota-dire-light border border-dota-dire/40';

  return (
    <div className={isRadiant ? 'team-radiant-panel p-6 rounded-xl shadow-panel' : 'team-dire-panel p-6 rounded-xl shadow-panel'}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 mb-5">
        <Image src={logo} alt={`${name} logo`} width={64} height={64} className="object-contain" priority />
        <h2 className={`font-cinzel text-2xl font-bold ${nameColour}`}>{name}</h2>
      </div>

      <div className="divider mb-4" />

      {/* ── Player list ────────────────────────────────────────────────────── */}
      <ul className="space-y-2">
        {players.map((p) => {
          const isYou = currentUserId !== undefined && p.id === currentUserId;
          return (
            <li
              key={`${teamId}-${p.id}`}
              className={`flex justify-between items-center rounded px-3 py-1.5 transition-colors ${
                isYou ? youBg : 'hover:bg-white/5'
              }`}
            >
              <span className={`font-barlow font-semibold flex items-center gap-2 ${isYou ? youText : 'text-dota-text'}`}>
                {p.username || 'Unknown'}
                {isYou && (
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${youBadgeBg}`}>
                    You
                  </span>
                )}
              </span>
              <span className="font-barlow font-bold tabular-nums text-dota-gold flex items-center gap-1">
                {p.gold ?? 0}
                <Image src="/Gold_symbol.webp" alt="Gold" width={14} height={14} className="inline-block" />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
