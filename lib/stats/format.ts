/**
 * Pure formatting and colour helpers for stats display.
 *
 * No React, no imports — safe to use from any component or route, and easy to
 * unit test. Extracted from StatsTab so the league and player views share one
 * definition rather than drifting apart.
 *
 * heroIconUrl in particular existed twice, verbatim, in StatsTab and
 * GameHistory. Both now import it from here.
 */

/** Success as a percentage of total, to one decimal. Returns 0 when total is 0
 *  rather than NaN, so callers can render it without guarding. */
export function pct(success: number, total: number): number {
  return total > 0 ? +((success / total) * 100).toFixed(1) : 0;
}

/** Tailwind classes banding a percentage: radiant green / gold / dire red. */
export function pctColour(value: number): string {
  if (value >= 60) return 'text-dota-radiant-light bg-dota-radiant/10 border-dota-radiant/30';
  if (value >= 40) return 'text-dota-gold       bg-dota-gold/10       border-dota-gold/30';
  return                  'text-dota-dire-light  bg-dota-dire/10       border-dota-dire/30';
}

/** Tailwind text colour banding a KDA ratio. */
export function kdaColour(kda: number): string {
  if (kda >= 4) return 'text-dota-gold';
  if (kda >= 2) return 'text-dota-radiant-light';
  return 'text-dota-text-muted';
}

/** Compact net worth: 12500 -> "12.5k", 12000 -> "12k", 800 -> "800". */
export function formatNW(val: number): string {
  if (val >= 1000) {
    const k = val / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `${val}`;
}

/**
 * Steam CDN URL for a hero's small portrait.
 *
 * Note the host is cdn.cloudflare.steamstatic.com. next.config.js allows
 * '*.steamstatic.com', whose single wildcard matches one subdomain label only —
 * so callers must use a plain <img>, not next/image, until that is widened to
 * '**.steamstatic.com'.
 */
export function heroIconUrl(hero: string): string {
  const name = hero.replace(/^npc_dota_hero_/, '');
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/${name}_sb.png`;
}

/** "npc_dota_hero_shadow_fiend" -> "Shadow Fiend". */
export function heroDisplayName(hero: string): string {
  return hero
    .replace(/^npc_dota_hero_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
