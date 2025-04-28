'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import Image from 'next/image';

export default function MobileResponsiveHeader({ user }: { user: any }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="bg-gradient-to-r from-radiant-green via-surface to-dire-red p-4 shadow-lg border-b border-gold">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
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

          {/* Mobile hamburger menu */}
          <button 
            onClick={() => setMenuOpen(true)}
            className="sm:hidden text-gold text-3xl"
          >
            <FaBars />
          </button>
        </div>
      </header>

      {/* Side menu */}
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
              <Link href="/" className="hover:text-gold transition" onClick={() => setMenuOpen(false)}>
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

      {/* Background overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
