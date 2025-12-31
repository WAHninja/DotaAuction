import './globals.css';
import { Cinzel } from 'next/font/google';
import BodyClassWrapper from '@/app/components/BodyClassWrapper';
import MobileResponsiveHeader from '@/app/components/MobileResponsiveHeader';
import db from '@/lib/db';
import { getSessionIdFromCookies } from '@/app/session';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-cinzel',
});

type RootLayoutProps = {
  children: React.ReactNode;
};

async function getUserFromSession() {
  const sessionId = await getSessionIdFromCookies();
  if (!sessionId) return null;

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
    return result.rows[0] ?? null;
  } catch (error) {
    console.error('Error fetching user from session:', error);
    return null;
  }
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const user = await getUserFromSession();

  return (
    <html lang="en" className={cinzel.variable}>
      <body className="relative z-10 bg-gradient-to-b from-gray-900 via-gray-800 to-black text-gray-200 font-sans min-h-screen flex flex-col">
        <BodyClassWrapper />
        <MobileResponsiveHeader user={user} />

        <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
          {children}
        </main>

        <footer className="bg-surface text-text-muted text-center p-4 border-t border-cooldown">
          <p className="text-sm">© 2025 Dota Auctions</p>
        </footer>
      </body>
    </html>
  );
}
