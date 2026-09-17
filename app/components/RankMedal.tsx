/**
 * RankMedal — Dota rank medal for a leaderboard position.
 *
 * Replaces the 🥇🥈🥉-then-plain-number pattern that was duplicated across five
 * places in StatsTab. Ranks 1–8 render /public/topN.png; anything past 8 falls
 * back to a muted number, so a table with 12 rows still reads sensibly.
 *
 * Usage:
 *   <RankMedal rank={i + 1} />                    // 22px, announces "Rank 3"
 *   <RankMedal rank={i + 1} size={20} label={false} />  // inline beside a name
 *
 * Notes:
 *
 *   Source art is 256×256 and renders at ~20px, so Next's image pipeline is
 *   doing real work here — it emits a downscaled WebP rather than shipping a
 *   256px PNG per row. Sizes below ~18px turn the medal into a coloured smudge;
 *   20px is about the floor at which the tier is still distinguishable.
 *
 *   The wrapper is a fixed-size inline-flex box. Without it the medal and the
 *   numeric fallback occupy different widths and rows 8 and 9 of a table don't
 *   line up.
 *
 *   Accessibility: the image is decorative (alt="") because a medal PNG has no
 *   useful alt text, and the position is carried by a visually-hidden "Rank N"
 *   instead. Pass label={false} where the rank is already announced by an
 *   adjacent cell or column header, to avoid reading it twice.
 */

import Image from 'next/image';

/** Highest rank with a medal asset. Bump if top9.png+ are ever added. */
export const MAX_MEDAL_RANK = 8;

type RankMedalProps = {
  /** 1-based leaderboard position. */
  rank: number;
  /** Rendered box in px. Below ~18 the medal stops being readable. */
  size?: number;
  className?: string;
  /** Emit a visually-hidden "Rank N" for screen readers. */
  label?: boolean;
};

export default function RankMedal({
  rank,
  size = 22,
  className = '',
  label = true,
}: RankMedalProps) {
  const hasMedal = Number.isFinite(rank) && rank >= 1 && rank <= MAX_MEDAL_RANK;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center align-middle ${className}`}
      style={{ width: size, height: size }}
    >
      {hasMedal ? (
        <Image
          src={`/top${rank}.png`}
          alt=""
          width={size}
          height={size}
          className="object-contain"
        />
      ) : (
        <span className="font-barlow text-xs font-bold tabular-nums text-dota-text-dim">
          {rank}
        </span>
      )}
      {label && <span className="sr-only">Rank {rank}</span>}
    </span>
  );
}
