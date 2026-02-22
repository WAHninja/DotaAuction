/**
 * GoldIcon — drop-in replacement for the recurring gold symbol image.
 *
 * Why a dedicated component?
 *   The gold coin appears 20+ times per page (TeamCard, AuctionHouse,
 *   GameHistory, StatsTab). Each `<Image src="/Gold_symbol.webp" …>`
 *   is a separate browser request with its own latency. Using a static
 *   import gives webpack a stable content-hash URL that gets cached
 *   aggressively after the first visit, and avoids the Next.js image
 *   optimisation pipeline overhead for a tiny decorative icon.
 *
 * Usage:
 *   import GoldIcon from '@/app/components/GoldIcon';
 *   <GoldIcon size={14} />     ← default, matches existing usages
 *   <GoldIcon size={20} />
 */

import Image from 'next/image';
import goldSrc from '@/public/Gold_symbol.webp';

type GoldIconProps = {
  size?: number;
  className?: string;
};

export default function GoldIcon({ size = 14, className = 'inline-block' }: GoldIconProps) {
  return (
    <Image
      src={goldSrc}          // static import → stable hash, browser caches forever
      alt="Gold"
      width={size}
      height={size}
      className={className}
    />
  );
}
