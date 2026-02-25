/**
 * PlayerAvatar
 *
 * Shows a player's Steam avatar if they have one linked, otherwise falls back
 * to a coloured circle with their initial. Used in CreateMatchForm and TeamCard.
 *
 * The colour of the fallback is derived from the username so it's stable across
 * sessions — the same player always gets the same colour.
 */

import Image from 'next/image';

// A small palette of muted colours that work on the dark Dota background.
const FALLBACK_COLOURS = [
  'bg-[#3d5c8a]', // blue
  'bg-[#5a3d8a]', // purple
  'bg-[#3d7a5a]', // teal
  'bg-[#7a5a3d]', // amber
  'bg-[#8a3d4a]', // rose
  'bg-[#3d6e7a]', // cyan
  'bg-[#6e7a3d]', // olive
  'bg-[#7a3d6e]', // pink
];

function colourForUsername(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_COLOURS[Math.abs(hash) % FALLBACK_COLOURS.length];
}

type PlayerAvatarProps = {
  username: string;
  steamAvatar?: string | null;
  size?: number;
  className?: string;
};

export default function PlayerAvatar({
  username,
  steamAvatar,
  size = 32,
  className = '',
}: PlayerAvatarProps) {
  const initial = username.charAt(0).toUpperCase();
  const fallbackColour = colourForUsername(username);

  if (steamAvatar) {
    return (
      <span
        className={`shrink-0 rounded-full overflow-hidden border border-dota-border inline-block ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={steamAvatar}
          alt={username}
          width={size}
          height={size}
          className="object-cover"
          unoptimized // external CDN URL — skip Next.js optimisation pipeline
        />
      </span>
    );
  }

  return (
    <span
      className={`shrink-0 rounded-full border border-dota-border inline-flex items-center justify-center ${fallbackColour} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        className="font-barlow font-bold text-white/80 leading-none select-none"
        style={{ fontSize: size * 0.42 }}
      >
        {initial}
      </span>
    </span>
  );
}
