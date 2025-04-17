import './globals.css';
import Link from 'next/link';
import { getSessionIdFromCookies } from '../lib/session';
import db from '../lib/db';
import { Cinzel } from 'next/font/google';

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
      // Fetch session and join user info
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
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-900 text-white font-sans">
        <header className="bg-gradient-to-r from-red-900 via-gray-900 to-blue-900 text-white p-4 shadow-lg border-b border-yellow-700">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-4xl font-cinzel tracking-wider text-yellow-400">
              <Link href="/">Dota Auctions</Link>
            </h1>
            <nav className="space-x-4 text-lg">
              {user ? (
                <>
                  <Link href="/">Home</Link>
                  <span className="italic">Welcome, {user.username}</span>
                  <form action="/logout" method="POST" className="inline">
                    <button className="ml-2 underline text-red-400 hover:text-red-300">Logout</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/register">Register</Link>
                  <Link href="/login">Login</Link>
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
