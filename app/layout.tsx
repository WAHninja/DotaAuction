import './globals.css';
import Link from 'next/link';
import { getSession } from '../lib/session';
import db from '@/lib/db';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sessionId = getSession();
  const session = sessionId
    ? await db.session.findUnique({
        where: { id: sessionId },
        include: { user: true },
      })
    : null;

  return (
    <html lang="en">
      <head>
        {/* Fonts */}
      </head>
      <body className="bg-gray-900 text-white font-sans">
        <header className="bg-blue-900 text-white p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-3xl font-bold font-cinzel">
              <Link href="/">Dota Auctions</Link>
            </h1>
            <nav className="space-x-4 text-lg">
              <Link href="/">Home</Link>
              {!session?.user && (
                <>
                  <Link href="/register">Register</Link>
                  <Link href="/login">Login</Link>
                </>
              )}
              {session?.user && (
                <>
                  <span className="italic">Welcome, {session.user.username}</span>
                  <form action="/logout" method="POST" className="inline">
                    <button className="ml-2 underline text-red-400">Logout</button>
                  </form>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="min-h-screen container mx-auto p-4">{children}</main>
        <footer className="bg-blue-900 text-white p-4 text-center">
          <p>© 2025 Dota Auctions</p>
        </footer>
      </body>
    </html>
  );
}
