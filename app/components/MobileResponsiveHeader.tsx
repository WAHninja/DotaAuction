'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useContext } from 'react';
import { Menu, X } from 'lucide-react';
import { UserContext } from '@/app/context/UserContext';
import LogoutButton from './LogoutButton';

export default function MobileResponsiveHeader() {
  const { user } = useContext(UserContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  // Tighten header on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Disable background scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    if (user !== undefined) setLoading(false);
  }, [user]);

  const closeMenu = () => setMenuOpen(false);

  const NavLinks = () => (
    <>
      {user && (
        <span className="font-barlow text-sm text-dota-text-muted tracking-wide">
          {user.username}
        </span>
      )}
      <Link
        href="/"
        className="font-barlow font-semibold text-sm tracking-widest uppercase text-dota-text-muted hover:text-dota-gold transition-colors"
        onClick={closeMenu}
      >
        Home
      </Link>
      {user && <LogoutButton />}
    </>
  );

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-40 transition-all duration-200 ${
          scrolled
            ? 'bg-dota-base/95 backdrop-blur-md shadow-raised border-b border-dota-border'
            : 'bg-dota-base border-b border-dota-border'
        }`}
      >
        {/* Radiant/Dire faction strip — thin colour bar at very top */}
        <div className="h-0.5 w-full bg-gradient-to-r from-dota-radiant via-dota-border to-dota-dire" />

        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">

          {/* ── Logo + title ─────────────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-3 group" onClick={closeMenu}>
            <Image
              src="/logo.png"
              alt="Defence of the Auctions"
              width={100}
              height={34}
              className="object-contain"
            />
            <span className="font-cinzel font-bold text-lg md:text-xl text-dota-gold tracking-wide group-hover:text-dota-gold-light transition-colors hidden sm:block">
              Defence of the Auctions
            </span>
          </Link>

          {/* ── Desktop nav ──────────────────────────────────────────────── */}
          <nav className="hidden sm:flex items-center gap-5">
            {!loading && <NavLinks />}
          </nav>

          {/* ── Mobile menu button ────────────────────────────────────────── */}
          <button
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
            className="sm:hidden p-1.5 rounded text-dota-text-muted hover:text-dota-gold transition-colors"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* ── Mobile side drawer ─────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 z-50 flex flex-col
          bg-dota-surface border-l border-dota-border shadow-raised
          transform transition-transform duration-300 ease-in-out
          ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dota-border">
          <span className="font-cinzel text-sm font-bold text-dota-gold tracking-wide">Menu</span>
          <button
            aria-label="Close menu"
            onClick={closeMenu}
            className="p-1 text-dota-text-muted hover:text-dota-gold transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex flex-col gap-1 p-4">
          {!loading && (
            <>
              {user && (
                <div className="px-3 py-2 mb-2 rounded bg-dota-overlay border border-dota-border">
                  <p className="font-barlow text-xs text-dota-text-muted tracking-widest uppercase mb-0.5">Signed in as</p>
                  <p className="font-barlow font-semibold text-dota-gold">{user.username}</p>
                </div>
              )}
              <Link
                href="/"
                onClick={closeMenu}
                className="px-3 py-2.5 rounded font-barlow font-semibold text-sm tracking-widest uppercase text-dota-text-muted hover:text-dota-gold hover:bg-dota-overlay transition-all"
              >
                Home
              </Link>
              {user && (
                <div className="mt-2">
                  <LogoutButton />
                </div>
              )}
            </>
          )}
        </nav>
      </aside>

      {/* ── Overlay ────────────────────────────────────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={closeMenu}
        />
      )}
    </>
  );
}
