'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useContext } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { UserContext } from '@/app/context/UserContext';
import LogoutButton from './LogoutButton';

export default function MobileResponsiveHeader() {
  const { user } = useContext(UserContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Disable background scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Detect when user is loaded
  useEffect(() => {
    if (user !== undefined) setLoading(false);
  }, [user]);

  const closeMenu = () => setMenuOpen(false);

  // Navigation links
  const NavLinks = () => (
    <>
      {user && <span className="italic text-gold">Welcome, {user.username}</span>}
      <Link href="/" className="hover:text-gold transition" onClick={closeMenu}>
        Home
      </Link>
      {user && <LogoutButton />}
    </>
  );

  return (
    <>
      {/* Header / Banner */}
      <header className="bg-gradient-to-r from-radiant-green via-surface to-dire-red p-4 shadow-lg border-b border-gold">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
          <div className="flex items-center space-x-4">
            <Image src="/logo.png" alt="Dota Auctions Logo" width={120} height={40} />
            <h1 className="text-2xl md:text-4xl font-cinzel tracking-wide text-gold drop-shadow-md">
              <Link href="/">Defence of the Auctions</Link>
            </h1>
          </div>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-4 text-base md:text-lg">
            {!loading && <NavLinks />}
          </nav>

          {/* Mobile menu button */}
          <button
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="sm:hidden text-gold text-3xl"
          >
            <FaBars />
          </button>
        </div>
      </header>

      {/* Mobile side menu */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-gray-900 z-50 transform ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        } transition-transform duration-300 ease-in-out shadow-2xl`}
      >
        <div className="flex justify-end p-4">
          <button aria-label="Close menu" onClick={closeMenu} className="text-gold text-3xl">
            <FaTimes />
          </button>
        </div>

        <nav className="flex flex-col items-start gap-6 p-8 text-lg">
          {!loading && <NavLinks />}
        </nav>
      </aside>

      {/* Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={closeMenu}
        />
      )}
    </>
  );
}
