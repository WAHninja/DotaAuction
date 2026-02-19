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
// Barlow Condensed is compact, legible, and has the slightly militaristic
// quality that suits Dota's aesthetic without being as decorative as Cinzel.
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
