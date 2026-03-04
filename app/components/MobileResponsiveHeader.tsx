'use client';

// app/components/MobileResponsiveHeader.tsx
//
// Structural changes from the original:
//
//   • DesktopNav and MobileDrawer are module-level components (not inline
//     arrow functions) so React reconciles them correctly across re-renders.
//
//   • Three concerns that were inlined are now dedicated hooks:
//       useScrolled       — scroll detection with correct initial sync
//       useFocusTrap      — shared with GameRulesCard (was duplicated)
//       useChangelogBadge — now accepts `enabled` so it never fires for
//                           logged-out visitors
//
//   • Changelog link is auth-gated: only rendered when `user` is truthy.
//     The standalone mobile badge is also gated. Logged-out users only see
//     the Home link and the logo.
//
//   • Scroll lock correctly saves and restores the previous overflow value
//     rather than unconditionally writing '' on cleanup, which would clobber
//     any other component (e.g. a modal) that also holds a lock.
//
//   • MobileDrawer has a full a11y treatment:
//       – focus trap via useFocusTrap
//       – Escape key closes the drawer
//       – aria-label, aria-modal, aria-hidden, aria-expanded, aria-controls
//       – all badge dots have sr-only labels
//       – overlay uses role="presentation" (it's a backdrop, not a control)
//
//   • closeMenu returns focus to the hamburger trigger after close.
//   • Style constants are at module level — not recreated each render.

import Link from 'next/link';
import Image from 'next/image';
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Menu, X, User, ScrollText } from 'lucide-react';
import { UserContext } from '@/app/context/UserContext';
import LogoutButton from './LogoutButton';
import { useChangelogBadge } from '@/app/hooks/useChangelogBadge';
import { useFocusTrap }      from '@/app/hooks/useFocusTrap';
import { useScrolled }       from '@/app/hooks/useScrolled';

// ── Module-level style constants ───────────────────────────────────────────────
// Defined here rather than inside the component body so they aren't
// re-created on every render.
const DESKTOP_LINK =
  'font-barlow font-semibold text-sm tracking-widest uppercase ' +
  'text-dota-text-muted hover:text-dota-gold transition-colors';

const MOBILE_LINK =
  'px-3 py-2.5 rounded font-barlow font-semibold text-sm tracking-widest uppercase ' +
  'text-dota-text-muted hover:text-dota-gold hover:bg-dota-overlay transition-all ' +
  'flex items-center gap-2';

// ── VisualBadgeDot ────────────────────────────────────────────────────────────
// The coloured dot shown next to the Changelog link.
// Always paired with a sr-only sibling at the call site.
function VisualBadgeDot({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`rounded-full bg-dota-gold shadow-gold ${className}`}
    />
  );
}

// ── DesktopNav ────────────────────────────────────────────────────────────────
// Hoisted to module level so React doesn't unmount/remount it on every
// parent render (which would happen if it were defined as a `const` inside
// MobileResponsiveHeader's function body).

type NavUser = { username: string } | null;

type DesktopNavProps = {
  user: NavUser;
  hasUnseen: boolean;
};

function DesktopNav({ user, hasUnseen }: DesktopNavProps) {
  return (
    <>
      {user && (
        <span className="font-barlow text-sm text-dota-text-muted tracking-wide">
          {user.username}
        </span>
      )}

      <Link href="/" className={DESKTOP_LINK}>
        Home
      </Link>

      {/* Profile, Changelog, and Logout are auth-gated */}
      {user && (
        <>
          <Link href="/profile" className={`${DESKTOP_LINK} flex items-center gap-1.5`}>
            <User className="w-3.5 h-3.5" aria-hidden="true" />
            Profile
          </Link>

          {/* Changelog — only visible when logged in */}
          <Link
            href="/changelog"
            className={`${DESKTOP_LINK} relative flex items-center gap-1.5`}
          >
            <ScrollText className="w-3.5 h-3.5" aria-hidden="true" />
            Changelog
            {hasUnseen && (
              <>
                <VisualBadgeDot className="absolute -top-1.5 -right-2.5 w-2 h-2" />
                <span className="sr-only">(new entries available)</span>
              </>
            )}
          </Link>

          <LogoutButton />
        </>
      )}
    </>
  );
}

// ── MobileDrawer ──────────────────────────────────────────────────────────────
// Extracted as its own component so its focus-trap and keyboard logic are
// self-contained and don't bloat the top-level component.

type MobileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  user: NavUser;
  hasUnseen: boolean;
};

function MobileDrawer({ isOpen, onClose, user, hasUnseen }: MobileDrawerProps) {
  // Focus is trapped inside the drawer while it's open.
  const drawerRef = useFocusTrap<HTMLElement>(isOpen);

  // Escape key closes the drawer — mirrors the behaviour of GameRulesCard's
  // Modal and is required for WCAG 2.1 SC 2.1.2.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <>
      {/* ── Drawer panel ─────────────────────────────────────────────────── */}
      <aside
        ref={drawerRef}
        id="mobile-nav-drawer"
        // aria-label describes the landmark to screen readers.
        aria-label="Navigation menu"
        // aria-modal suppresses background content in supporting SRs.
        aria-modal={isOpen}
        // aria-hidden removes the element from the accessibility tree when
        // closed, preventing keyboard users from tabbing into off-screen links.
        aria-hidden={!isOpen}
        // tabIndex={-1} allows the container to receive programmatic focus
        // as a fallback when no focusable children are present.
        tabIndex={-1}
        className={`
          fixed top-0 right-0 h-full w-64 z-50 flex flex-col
          bg-dota-surface border-l border-dota-border shadow-raised
          transform transition-transform duration-300 ease-in-out
          focus:outline-none
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dota-border">
          <span className="font-cinzel text-sm font-bold text-dota-gold tracking-wide">
            Menu
          </span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-1 text-dota-text-muted hover:text-dota-gold transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Drawer nav */}
        <nav aria-label="Mobile navigation" className="flex flex-col gap-1 p-4">
          {user && (
            <div className="px-3 py-2 mb-2 rounded bg-dota-overlay border border-dota-border">
              <p className="font-barlow text-xs text-dota-text-muted tracking-widest uppercase mb-0.5">
                Signed in as
              </p>
              <p className="font-barlow font-semibold text-dota-gold">{user.username}</p>
            </div>
          )}

          <Link href="/" onClick={onClose} className={MOBILE_LINK}>
            Home
          </Link>

          {/* Profile, Changelog, and Logout are auth-gated */}
          {user && (
            <>
              <Link href="/profile" onClick={onClose} className={MOBILE_LINK}>
                <User className="w-3.5 h-3.5" aria-hidden="true" />
                Profile
              </Link>

              {/* Changelog — only visible when logged in */}
              <Link href="/changelog" onClick={onClose} className={MOBILE_LINK}>
                <ScrollText className="w-3.5 h-3.5" aria-hidden="true" />
                Changelog
                {hasUnseen && (
                  // "New" label as text rather than just a dot so it reads
                  // naturally in the drawer layout.
                  <span
                    aria-label="New changelog entries"
                    className="ml-auto flex items-center gap-1 font-barlow text-xs font-bold text-dota-gold"
                  >
                    <VisualBadgeDot className="w-1.5 h-1.5" />
                    New
                  </span>
                )}
              </Link>

              <div className="mt-2">
                <LogoutButton />
              </div>
            </>
          )}
        </nav>
      </aside>

      {/* ── Backdrop overlay ─────────────────────────────────────────────── */}
      {/* role="presentation" — this is a visual backdrop, not an interactive
          control. The Escape key (handled above) is the keyboard equivalent
          of clicking it. A plain div with onClick is not keyboard-accessible,
          so we don't try to make it one. */}
      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}
    </>
  );
}

// ── MobileResponsiveHeader ────────────────────────────────────────────────────

export default function MobileResponsiveHeader() {
  const { user, loading: authLoading } = useContext(UserContext);
  const [menuOpen, setMenuOpen]        = useState(false);

  const scrolled  = useScrolled();
  // Pass !!user so the fetch never fires for logged-out visitors.
  // The endpoint requires auth anyway, but this avoids the console 401.
  const hasUnseen = useChangelogBadge(!!user);

  // Ref used to return focus to the trigger button after the drawer closes.
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // ── Scroll lock ────────────────────────────────────────────────────────────
  // Saves and restores the *previous* overflow value rather than blindly
  // writing '' on cleanup, which would clobber any other component (e.g. a
  // modal) that also holds a scroll lock.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  // useCallback keeps stable references so child components using React.memo
  // don't re-render unnecessarily.
  const openMenu = useCallback(() => setMenuOpen(true), []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    // Return focus to the trigger after the drawer's exit animation completes.
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Sticky header ────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-40 transition-all duration-200 ${
          scrolled
            ? 'bg-dota-base/95 backdrop-blur-md shadow-raised border-b border-dota-border'
            : 'bg-dota-base border-b border-dota-border'
        }`}
      >
        {/* Radiant-to-Dire colour bar */}
        <div className="h-0.5 w-full bg-gradient-to-r from-dota-radiant via-dota-border to-dota-dire" />

        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">

          {/* ── Logo ───────────────────────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-3 group">
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

          {/* ── Desktop nav ────────────────────────────────────────────────── */}
          {/* aria-label distinguishes this from the mobile drawer's nav landmark */}
          <nav
            className="hidden sm:flex items-center gap-5"
            aria-label="Main navigation"
          >
            {!authLoading && <DesktopNav user={user} hasUnseen={hasUnseen} />}
          </nav>

          {/* ── Mobile controls ────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 sm:hidden">
            {/*
              Standalone changelog shortcut — only shown when:
                • the user is logged in (changelog is auth-gated)
                • there are unseen entries (otherwise there's nothing to surface)
                • the drawer isn't already open (redundant if drawer is visible)
            */}
            {user && hasUnseen && !menuOpen && (
              <Link
                href="/changelog"
                aria-label="Changelog — new entries available"
                className="relative p-1.5 rounded text-dota-text-muted hover:text-dota-gold transition-colors"
              >
                <ScrollText className="w-5 h-5" aria-hidden="true" />
                <VisualBadgeDot className="absolute top-0.5 right-0.5 w-2 h-2" />
              </Link>
            )}

            {/*
              Hamburger / close button.
              • aria-expanded communicates the current state to screen readers.
              • aria-controls associates the button with the drawer it controls.
              • A single static aria-label ("Main menu") is more robust than a
                dynamic one — aria-expanded already conveys open/closed state.
            */}
            <button
              ref={menuButtonRef}
              aria-label="Main menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-drawer"
              onClick={menuOpen ? closeMenu : openMenu}
              className="p-1.5 rounded text-dota-text-muted hover:text-dota-gold transition-colors"
            >
              {menuOpen
                ? <X    className="w-6 h-6" aria-hidden="true" />
                : <Menu className="w-6 h-6" aria-hidden="true" />
              }
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer (rendered outside header to avoid z-index clipping) ── */}
      <MobileDrawer
        isOpen={menuOpen}
        onClose={closeMenu}
        user={user}
        hasUnseen={hasUnseen}
      />
    </>
  );
}
