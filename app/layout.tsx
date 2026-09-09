import './globals.css';
import type { Metadata } from 'next';
import { Barlow_Condensed } from 'next/font/google';
import PageBackground           from '@/app/components/PageBackground';
import MobileResponsiveHeader   from '@/app/components/MobileResponsiveHeader';
import UserProvider             from './context/UserContext';
import { OnlineUsersProvider }  from '@/app/context/OnlineUsersContext';
import { JitsiProvider }        from '@/app/context/JitsiContext';
import ChatWidget               from '@/app/components/ChatWidget';
import KeepAlive                from '@/app/components/KeepAlive';

export const dynamic = 'force-dynamic';

// ── Metadata ─────────────────────────────────────────────────────────────────
// Browser tabs previously showed the bare URL. The template lets each page
// contribute its own title (e.g. export metadata = { title: 'Match #42' }
// from a page/layout) while falling back to the app name.
export const metadata: Metadata = {
  title: {
    default: 'Defence of the Auctions',
    template: '%s — Defence of the Auctions',
  },
  description: 'Draft, bid, and betray. A player-auction league for Dota 2.',
};

// ── UI font — everything: headings, buttons, stats, labels, body copy ────────
// Cinzel is retired: the v2 theme uses Barlow Condensed (bold, uppercase,
// tracked) for display type as well, matching the actual Dota client's
// condensed-grotesque register. A `font-cinzel` shim in globals.css maps any
// remaining `font-cinzel` classes in components to this face, so nothing
// breaks while those classes are migrated.
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
});

type RootLayoutProps = { children: React.ReactNode };

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={barlowCondensed.variable}>
      <head>
        <link rel="preload" href="/Gold_symbol.webp" as="image" type="image/webp" />
        <link rel="preload" href="/logo.png"  as="image" type="image/png" />
      </head>
      <body className="min-h-screen flex flex-col">

        <a
          href="#main-content"
          className="
            sr-only focus:not-sr-only
            focus:fixed focus:top-4 focus:left-4 focus:z-50
            focus:px-4 focus:py-2
            focus:bg-dota-gold focus:text-dota-base
            focus:font-barlow focus:font-bold focus:text-sm
            focus:outline focus:outline-2 focus:outline-dota-gold-dark
          "
        >
          Skip to main content
        </a>

        <UserProvider>
          {/*
            OnlineUsersProvider must be inside UserProvider so it can read
            the current user ID from UserContext.
          */}
          <OnlineUsersProvider>
            {/*
              JitsiProvider wraps everything so both the widget and any page
              (e.g. the match page) can read and mutate chat state via context.
              The widget itself is rendered here so it persists across all
              client-side navigations — Next.js keeps layout components mounted.
            */}
            <JitsiProvider>
              <PageBackground />
              <MobileResponsiveHeader />
              <KeepAlive />

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

              {/*
                JitsiWidget is outside <main> so it overlays on top of all
                page content as a fixed floating panel. It reads auth state
                and Jitsi state internally via context — no props needed.
              */}
              <ChatWidget />
            </JitsiProvider>
          </OnlineUsersProvider>
        </UserProvider>
      </body>
    </html>
  );
}
