import './globals.css';
import Link from 'next/link';
import { getSessionIdFromCookies } from '../lib/session';
import db from '../lib/db';
import { Cinzel } from 'next/font/google';
import Image from 'next/image';
import Head from 'next/head';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-cinzel',
});

// Subcomponent to add className based on pathname (client-only)
function BodyClassWrapper() {
  'use client';
  import { useEffect } from 'react';
  import { usePathname } from 'next/navigation';

  useEffect(() => {
    const pathname = usePathname();
    const isRegister = pathname === '/register';

    const body = document.body;
    if (isRegister) {
      body.classList.add('bg-[url("/bg-smoke.jpg")]', 'bg-cover', 'bg-center', 'bg-no-repeat');
    } else {
      body.classList.remove('bg-[url("/bg-smoke.jpg")]', 'bg-cover', 'bg-center', 'bg-no-repeat');
    }
  }, []);

  return null;
}

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
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="bg-background text-text font-sans">
        <BodyClassWrapper />

        <header className="bg-gradient-to-r from-dire-red via-surface to-radiant-green p-4 shadow-lg border-b border-gold">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="Dota Auctions Logo"
                width={150}
                height={50}
              />
              <h1 className="text-4xl font-cinzel tracking-wide text-gold drop-shadow-md">
                <Link href="/">Defence of the Auctions</Link>
              </h1>
            </div>
            <nav className="space-x-4 text-lg">
              {user ? (
                <>
                  <span className="italic text-gold">Welcome, {user.username}</span>
                  <Link href="/" className="hover:text-gold transition">Home</Link>
                  <form action="/logout" method="POST" className="inline">
                    <button className="ml-2 underline text-dire-red hover:text-gold transition">Logout</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/register" className="hover:text-radiant-green transition">Register</Link>
                  <Link href="/login" className="hover:text-radiant-green transition">Login</Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main className="min-h-screen container mx-auto px-4 py-8">
          {children}
        </main>

        <footer className="bg-surface text-text-muted text-center p-4 border-t border-cooldown">
          <p className="text-sm">© 2025 Dota Auctions</p>
        </footer>
      </body>
    </html>
  );
}
