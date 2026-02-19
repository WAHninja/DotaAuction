import './globals.css';
import { Cinzel } from 'next/font/google';
import BodyClassWrapper from '@/app/components/BodyClassWrapper';
import MobileResponsiveHeader from '@/app/components/MobileResponsiveHeader';
import UserProvider from './context/UserContext';
import KeepAlive from '@/app/components/KeepAlive';

export const dynamic = 'force-dynamic';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-cinzel',
});

type RootLayoutProps = { children: React.ReactNode };

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={cinzel.variable}>
      <body className="relative z-10 bg-gradient-to-b from-gray-900 via-gray-800 to-black text-gray-200 font-sans min-h-screen flex flex-col">
        <UserProvider>
          <BodyClassWrapper />
          <MobileResponsiveHeader />
          <KeepAlive />

          <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">{children}</main>

          <footer className="bg-surface text-text-muted text-center p-4 border-t border-cooldown">
            <p className="text-sm">© 2025 Dota Auctions</p>
          </footer>
        </UserProvider>
      </body>
    </html>
  );
}
