'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useContext } from 'react';
import { Menu, X, User, ScrollText } from 'lucide-react';
import { UserContext } from '@/app/context/UserContext';
import LogoutButton from './LogoutButton';
import { useChangelogBadge } from '@/app/hooks/useChangelogBadge';

export default function MobileResponsiveHeader() {
  const { user }                    = useContext(UserContext);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [loading, setLoading]       = useState(true);
  const [scrolled, setScrolled]     = useState(false);
  const hasUnseen                   = useChangelogBadge();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    if (user !== undefined) setLoading(false);
  }, [user]);

  const closeMenu = () => setMenuOpen(false);

  // ── Shared nav link styles ─────────────────────────────────────────────────
  const desktopLink = 'font-barlow font-semibold text-sm tracking-widest uppercase text-dota-text-muted hover:text-dota-gold transition-colors';
  const mobileLink  = 'px-3 py-2.5 rounded font-barlow font-semibold text-sm tracking-widest uppercase text-dota-text-muted hover:text-dota-gold hover:bg-dota-overlay transition-all flex items-center gap-2';

  // ── Desktop nav ────────────────────────────────────────────────────────────
  const DesktopNav = () => (
    <>
      {user && (
        <span className="font-barlow text-sm text-dota-text-muted tracking-wide">
          {user.username}
        </span>
      )}

      <Link href="/" className={desktopLink} onClick={closeMenu}>
        Home
      </Link>

      {user && (
        <Link href="/profile" className={`${desktopLink} flex items-center gap-1.5`} onClick={closeMenu}>
          <User className="w-3.5 h-3.5" />
          Profile
        </Link>
      )}

      {/* Changelog with badge */}
      <Link href="/changelog" className={`${desktopLink} relative flex items-center gap-1.5`} onClick={closeMenu}>
        <ScrollText className="w-3.5 h-3.5" />
        Changelog
        {hasUnseen && (
          <span className="absolute -top-1.5 -right-2.5 w-2 h-2 rounded-full bg-dota-gold shadow-gold" />
        )}
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
        <div className="h-0.5 w-full bg-gradient-to-r from-dota-radiant via-dota-border to-dota-dire" />

        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">

          {/* ── Logo + title ─────────────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-3 group" onClick={closeMenu}>
            <Image
              src="/logo.png"
              alt="Defence of the Auctions"
              width={100}
              height={34}
              priority
              sizes="100px"
              className="object-contain"
            />
            <span className="font-cinzel font-bold text-lg md:text-xl text-dota-gold tracking-wide group-hover:text-dota-gold-light transition-colors hidden sm:block">
              Defence of the Auctions
            </span>
          </Link>

          {/* ── Desktop nav ──────────────────────────────────────────────── */}
          <nav className="hidden sm:flex items-center gap-5">
            {!loading && <DesktopNav />}
          </nav>

          {/* ── Mobile: changelog badge + menu button ─────────────────────── */}
          <div className="flex items-center gap-2 sm:hidden">
            {/* Standalone badge visible on mobile so it's not hidden inside the drawer */}
            {hasUnseen && !menuOpen && (
              <Link
                href="/changelog"
                onClick={closeMenu}
                className="relative p-1.5 rounded text-dota-text-muted hover:text-dota-gold transition-colors"
                aria-label="New changelog entries"
              >
                <ScrollText className="w-5 h-5" />
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-dota-gold shadow-gold" />
              </Link>
            )}
            <button
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded text-dota-text-muted hover:text-dota-gold transition-colors"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile side drawer ─────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 z-50 flex flex-col
          bg-dota-surface border-l border-dota-border shadow-raised
          transform transition-transform duration-300 ease-in-out
          ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
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

        <nav className="flex flex-col gap-1 p-4">
          {!loading && (
            <>
              {user && (
                <div className="px-3 py-2 mb-2 rounded bg-dota-overlay border border-dota-border">
                  <p className="font-barlow text-xs text-dota-text-muted tracking-widest uppercase mb-0.5">Signed in as</p>
                  <p className="font-barlow font-semibold text-dota-gold">{user.username}</p>
                </div>
              )}

              <Link href="/" onClick={closeMenu} className={mobileLink}>
                Home
              </Link>

              {user && (
                <Link href="/profile" onClick={closeMenu} className={mobileLink}>
                  <User className="w-3.5 h-3.5" />
                  Profile
                </Link>
              )}

              {/* Changelog with badge */}
              <Link href="/changelog" onClick={closeMenu} className={`${mobileLink} relative`}>
                <ScrollText className="w-3.5 h-3.5" />
                Changelog
                {hasUnseen && (
                  <span className="ml-auto flex items-center gap-1 font-barlow text-xs font-bold text-dota-gold">
                    <span className="w-1.5 h-1.5 rounded-full bg-dota-gold" />
                    New
                  </span>
                )}
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
