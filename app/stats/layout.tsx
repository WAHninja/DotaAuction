import StatsProvider from '@/app/components/stats/StatsProvider';

/**
 * Mounts StatsProvider once for every route under /stats.
 *
 * Previously each page mounted its own, so clicking a row in the standings
 * table refetched the whole payload just to render one player's slice of data
 * it had already downloaded. A layout persists across navigations between its
 * child routes, so the provider — and its state — survives the transition.
 *
 * A server component: it holds no state itself and only renders the provider,
 * which carries its own 'use client'.
 */
export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return <StatsProvider>{children}</StatsProvider>;
}
