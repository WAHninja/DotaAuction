import './globals.css';
import { Cinzel, Barlow_Condensed } from 'next/font/google';
import BodyClassWrapper from '@/app/components/BodyClassWrapper';
import MobileResponsiveHeader from '@/app/components/MobileResponsiveHeader';
import UserProvider from './context/UserContext';
import KeepAlive from '@/app/components/KeepAlive';

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
          Preload hints for images that appear on almost every page.

          `as="image"` + `type` lets the browser fetch these during HTML
          parse — before JS has run and React has mounted — so they're
          ready (or in-flight) by the time components actually render them.

          Gold symbol: used 20+ times per page across TeamCard, AuctionHouse,
          GameHistory, and StatsTab. A single preload covers all of them.

          Logo: always in the sticky header, visible on every page.

          Team logos: immediately visible on any match page. Both are small
          PNGs so the cost of preloading one that isn't used is negligible.
        */}
        <link rel="preload" href="/Gold_symbol.webp" as="image" type="image/webp" />
        <link rel="preload" href="/logo.png"  as="image" type="image/png" />
        <link rel="preload" href="/Team1.png" as="image" type="image/png" />
        <link rel="preload" href="/TeamA.png" as="image" type="image/png" />
      </head>
      <body className="min-h-screen flex flex-col">
        <UserProvider>
          <BodyClassWrapper />
          <MobileResponsiveHeader />
          <KeepAlive />

          <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
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
