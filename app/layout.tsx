'use client';

import './globals.css';
import Link from 'next/link';
import { getSessionIdFromCookies } from '@/app/session';
import db from '../lib/db';
import { Cinzel } from 'next/font/google';
import Image from 'next/image';
import BodyClassWrapper from './components/BodyClassWrapper';
import { useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa'; // For hamburger and close icons

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

// --- COMPONENTS --- //

function MobileResponsiveHeader({ user }: { user: any }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="bg-gradient-to-r from-radiant-green via-surface to-dire-red p-4 shadow-lg border-b border-gold">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
          {/* Logo + Title */}
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

          {/* Desktop Nav */}
          <nav className="hidden sm:flex items-center gap-4 text-base md:text-lg">
            {user && (
              <>
                <span className="italic text-gold">Welcome, {user.username}</span>
                <Link href="/" className="hover:text-gold transition">Home</Link>
                <form action="/logout" method="POST" className="inline">
                  <button className="underline text-dire-red hover:text-gold transition">Logout</button>
                </form>
              </>
            )}
          </nav>

          {/* Mobile Hamburger */}
          <button 
            onClick={() => setMenuOpen(true)}
            className="sm:hidden text-gold text-3xl"
          >
            <FaBars />
          </button>
        </div>
      </header>

      {/* Mobile Side Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-gray-900 z-50 transform ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        } transition-transform duration-300 ease-in-out shadow-lg`}
      >
        <div className="flex justify-end p-4">
          <button
            onClick={() => setMenuOpen(false)}
            className="text-gold text-3xl"
          >
            <FaTimes />
          </button>
        </div>
        <nav className="flex flex-col items-start gap-6 p-8 text-lg">
          {user && (
            <>
              <span className="italic text-gold">Welcome, {user.username}</span>
              <Link
                href="/"
                className="hover:text-gold transition"
                onClick={() => setMenuOpen(false)}
              >
                Home
              </Link>
              <form
                action="/logout"
                method="POST"
                className="inline"
                onSubmit={() => setMenuOpen(false)}
              >
                <button className="underline text-dire-red hover:text-gold transition">Logout</button>
              </form>
            </>
          )}
        </nav>
      </div>

      {/* Overlay when menu is open */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
