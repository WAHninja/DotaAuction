import './globals.css';
import { Cinzel, Barlow_Condensed } from 'next/font/google';
import PageBackground           from '@/app/components/PageBackground';
import MobileResponsiveHeader   from '@/app/components/MobileResponsiveHeader';
import UserProvider             from './context/UserContext';
import KeepAlive                from '@/app/components/KeepAlive';

export const dynamic = 'force-dynamic';

// ── Display font — Dota title cards, match headings, section labels ──────────
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-cinzel',
  display: 'swap',
});

// ── UI font — buttons, stats, labels, table headers, body copy ───────────────
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
});

type RootLayoutProps = { children: React.ReactNode };

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${cinzel.variable} ${barlowCondensed.variable}`}>
      <head>
        {/*
          Preload hints for assets that appear on almost every page.

          `as="image"` + `type` lets the browser fetch these during HTML
          parse — before JS has run and React has mounted — so they're
          ready (or in-flight) by the time components actually render them.

          Gold symbol: used 20+ times per page across TeamCard, AuctionHouse,
          GameHistory, and StatsTab. A single preload covers all of them.

          Logo: always in the sticky header, visible on every page.

          Team logos: immediately visible on any match page. Both are small
          PNGs so the cost of preloading one that isn't used is negligible.

          Note: dashboard-background.jpg is intentionally NOT preloaded.
          It is decorative, sits behind a darkening overlay, and is never the
          LCP element. Preloading it would compete with the assets above for
          no perceptible benefit.
        */}
        <link rel="preload" href="/Gold_symbol.webp" as="image" type="image/webp" />
        <link rel="preload" href="/logo.png"  as="image" type="image/png" />
        <link rel="preload" href="/Team1.png" as="image" type="image/png" />
        <link rel="preload" href="/TeamA.png" as="image" type="image/png" />
      </head>
      <body className="min-h-screen flex flex-col">

        {/*
          Skip navigation link — WCAG 2.4.1 (Bypass Blocks), Level A.

          Keyboard and screen reader users land here first on every page.
          Without it they must Tab through all header links before reaching
          the main content — a significant accessibility barrier.

          Visually hidden by default (sr-only), revealed on :focus so it's
          invisible to mouse users but immediately usable by keyboard users.
          The gold-on-base colour ensures sufficient contrast when visible.
        */}
        <a
          href="#main-content"
          className="
            sr-only focus:not-sr-only
            focus:fixed focus:top-4 focus:left-4 focus:z-50
            focus:px-4 focus:py-2 focus:rounded
            focus:bg-dota-gold focus:text-dota-base
            focus:font-barlow focus:font-bold focus:text-sm
            focus:shadow-raised
          "
        >
          Skip to main content
        </a>

        <UserProvider>
          {/*
            PageBackground uses fixed positioning at z-[-1].
            UserProvider must remain a React fragment (no wrapper element)
            so no intermediate positioned ancestor disrupts the stacking
            context. See PageBackground.tsx for the full explanation.
          */}
          <PageBackground />
          <MobileResponsiveHeader />
          <KeepAlive />

          {/*
            id="main-content" is the skip link target.
            Responsive horizontal padding mirrors the header's px-4 sm:px-6 lg:px-8
            so content aligns with the nav at all viewport widths.
          */}
          <main
            id="main-content"
            className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8"
          >
            {children}
          </main>

          <footer className="border-t border-dota-border py-4 px-6 text-center">
            <p className="font-barlow text-sm text-dota-text-dim tracking-wide">
              © 2025 Defence of the Auctions
            </p>
          </footer>
        </UserProvider>
      </body>
    </html>
  );
}
