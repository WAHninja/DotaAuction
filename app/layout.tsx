import './globals.css';
import Link from 'next/link';
import { getSessionIdFromCookies } from '@/app/session';
import db from '../lib/db';
import { Cinzel } from 'next/font/google';
import Image from 'next/image';
import BodyClassWrapper from './components/BodyClassWrapper';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-cinzel',
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sessionId = await getSessionIdFromCookies();
  let user = null;

  if (sessionId) {
    try {
      const result = await db.query(
        `
        SELECT users.username
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.id = $1
        LIMIT 1
        `,
        [sessionId]
      );

      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    } catch (error) {
      console.error('Error fetching session and user:', error);
    }
  }

  return (
    <html lang="en" className={cinzel.variable}>
      <body className="relative z-10 bg-gradient-to-b from-gray-900 via-gray-800 to-black text-gray-200 font-sans min-h-screen flex flex-col">
        <BodyClassWrapper />

        <header className="bg-gradient-to-r from-radiant-green via-surface to-dire-red p-4 shadow-lg border-b border-gold">
          <div className="container mx-auto flex justify-between items-center px-4">
            <div className="flex items-center space-x-4">
              <Image
                src="/logo.png"
                alt="Dota Auctions Logo"
                width={120}
                height={40}
                className="h-auto w-auto"
              />
              <h1 className="text-2xl md:text-4xl font-cinzel tracking-wide text-gold drop-shadow-md">
                <Link href="/">Defence of the Auctions</Link>
              </h1>
            </div>
            <nav className="space-x-4 text-base md:text-lg">
              {user ? (
                <>
                  <span className="italic text-gold hidden sm:inline">Welcome, {user.username}</span>
                  <Link href="/" className="hover:text-gold transition">Home</Link>
                  <form action="/logout" method="POST" className="inline">
                    <button className="ml-2 underline text-dire-red hover:text-gold transition">Logout</button>
                  </form>
                </>
              ) : null}
            </nav>
          </div>
        </header>

        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>

        <footer className="bg-surface text-text-muted text-center p-4 border-t border-cooldown">
          <p className="text-sm">© 2025 Dota Auctions</p>
        </footer>
      </body>
    </html>
  );
}
