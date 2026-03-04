'use client';

// app/components/MobileResponsiveHeader.tsx
//
// UI/UX changes in this version (on top of the previous accessibility refactor):
//
//   Active page indicator
//     navLink() and mobileNavLink() return the active style when the current
//     path matches. Match pages use a prefix check; all others are exact.
//
//   Username merged into Profile link
//     The standalone <span>{username}</span> is removed. The Profile link
//     now shows the username as its label, making it clearly interactive.
//     This also removes the redundancy of having the username displayed next
//     to a Profile link that goes to the same place.
//
//   "Home" removed from nav
//     The logo is already a home link — duplicating it in the nav is
//     redundant. Logged-in users see "Dashboard" (the actual page name) as
//     the first nav link. Logged-out users see no nav links; the logo is
//     sufficient.
//
//   Sign out visual separation
//     A vertical divider separates the destructive Sign out action from the
//     navigation links on desktop. It's visually distinct from nav links and
//     has no ambiguity about what clicking it does.
//
//   Mobile drawer sign out
//     LogoutButton receives showConfirm so accidental taps don't silently
//     end the session. It also receives a full-width class so it matches the
//     visual rhythm of the link items above it.
//
//   Route-aware gradient accent bar
//     The Radiant↔Dire bar only appears on match pages. Auth pages get a
//     gold gradient. All other pages get a subtle border-only line.
//
//   Title at xs breakpoint
//     "DotA" appears at xs (below sm) so the logo area is never just a
//     bare image with no text label for new users.
//
//   Scroll threshold and transition
//     useScrolled threshold raised to 40px (was 8px). Transition raised to
//     300ms (was 200ms) for a smoother feel.
//
//   Responsive header padding
//     px-4 sm:px-6 lg:px-8 so the nav content doesn't feel cramped at the
//     edges of wide viewports.
//
//   Badge dot entrance animation
//     The badge dot scales in when it first appears rather than popping
//     into existence. animationIterationCount: 1 fires animate-ping once.

import Link        from 'next/link';
import Image       from 'next/image';
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePathname }  from 'next/navigation';
import { Menu, X, ScrollText } from 'lucide-react';
import { UserContext }          from '@/app/context/UserContext';
import LogoutButton             from './LogoutButton';
import { useChangelogBadge }    from '@/app/hooks/useChangelogBadge';
import { useFocusTrap }         from '@/app/hooks/useFocusTrap';
import { useScrolled }          from '@/app/hooks/useScrolled';

// ── Module-level style constants ──────────────────────────────────────────────

const DESKTOP_LINK =
  'font-barlow font-semibold text-sm tracking-widest uppercase ' +
  'text-dota-text-muted hover:text-dota-gold transition-colors';

// Active state: gold colour + underline
const DESKTOP_LINK_ACTIVE =
  'font-barlow font-semibold text-sm tracking-widest uppercase ' +
  'text-dota-gold border-b border-dota-gold/50 pb-0.5 transition-colors';

const MOBILE_LINK =
  'px-3 py-2.5 rounded font-barlow font-semibold text-sm tracking-widest uppercase ' +
  'text-dota-text-muted hover:text-dota-gold hover:bg-dota-overlay transition-all ' +
  'flex items-center gap-2';

// Active state: gold colour + subtle background
const MOBILE_LINK_ACTIVE =
  'px-3 py-2.5 rounded font-barlow font-semibold text-sm tracking-widest uppercase ' +
  'text-dota-gold bg-dota-overlay/60 transition-all ' +
  'flex items-center gap-2';

// ── Active link helpers ────────────────────────────────────────────────────────

// Returns the correct desktop link class for the given href.
// `exact` controls whether the check is strict equality or a prefix match.
function navLink(href: string, pathname: string, exact = true): string {
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return isActive ? DESKTOP_LINK_ACTIVE : DESKTOP_LINK;
}

function mobileNavLink(href: string, pathname: string, exact = true): string {
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return isActive ? MOBILE_LINK_ACTIVE : MOBILE_LINK;
}

// ── VisualBadgeDot ────────────────────────────────────────────────────────────
// The coloured dot shown next to Changelog when there are unseen entries.
// aria-hidden because the text label adjacent to it is the accessible signal.
// One-shot ping: animationIterationCount overrides animate-ping's `infinite`.

function VisualBadgeDot({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ animationIterationCount: 1 }}
      className={`rounded-full bg-dota-gold shadow-gold animate-ping ${className}`}
    />
  );
}

// ── Gradient accent bar ───────────────────────────────────────────────────────
// Three variants:
//   Match pages  — full Radiant (green) ↔ Dire (red) tension bar
//   Auth pages   — subtle gold glow (welcoming, no team allegiance)
//   Everywhere   — border-only line, no team colour

function AccentBar({ pathname }: { pathname: string }) {
  const isMatch = pathname.startsWith('/match/');
  const isAuth  = pathname === '/login' || pathname === '/register';

  if (isMatch) {
    return (
      <div
        aria-hidden="true"
        className="h-0.5 w-full bg-gradient-to-r from-dota-radiant via-dota-border to-dota-dire"
      />
    );
  }

  if (isAuth) {
    return (
      <div
        aria-hidden="true"
        className="h-0.5 w-full bg-gradient-to-r from-transparent via-dota-gold/40 to-transparent"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="h-0.5 w-full bg-dota-border"
    />
  );
}

// ── DesktopNav ────────────────────────────────────────────────────────────────
// Hoisted to module level so React doesn't unmount/remount it on every parent
// render (which happens when components are defined as `const` inside the
// function body — React creates a new component type each render).

type NavUser = { username: string } | null;

type DesktopNavProps = {
  user:      NavUser;
  hasUnseen: boolean;
  pathname:  string;
};

function DesktopNav({ user, hasUnseen, pathname }: DesktopNavProps) {
  if (!user) return null;

  return (
    <>
      {/* Dashboard — first nav link for logged-in users.
          "Home" removed: the logo already links to "/". Naming it "Dashboard"
          is more accurate about where you're going. */}
      <Link
        href="/dashboard"
        className={navLink('/dashboard', pathname)}
      >
        Dashboard
      </Link>

      {/* Profile link uses the username as its label.
          The standalone username <span> was removed — it looked interactive
          but wasn't, and duplicated the information in the Profile link. */}
      <Link
        href="/profile"
        className={navLink('/profile', pathname)}
      >
        {user.username}
      </Link>

      {/* Changelog — auth-gated so the fetch and the link only exist for
          logged-in users. */}
      <Link
        href="/changelog"
        className={`${navLink('/changelog', pathname)} relative flex items-center gap-1.5`}
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

      {/* Divider — visually separates the destructive Sign out from nav links.
          aria-hidden: purely decorative. */}
      <span aria-hidden="true" className="w-px h-4 bg-dota-border mx-1" />

      {/* Sign out — desktop version is compact and inline.
          No confirm step on desktop; the visual separation and deliberate
          cursor targeting are sufficient. The mobile drawer uses showConfirm. */}
      <LogoutButton />
    </>
  );
}

// ── MobileDrawer ──────────────────────────────────────────────────────────────

type MobileDrawerProps = {
  isOpen:    boolean;
  onClose:   () => void;
  user:      NavUser;
  hasUnseen: boolean;
  pathname:  string;
};

function MobileDrawer({ isOpen, onClose, user, hasUnseen, pathname }: MobileDrawerProps) {
  const drawerRef = useFocusTrap<HTMLElement>(isOpen);

  // Escape key closes the drawer — WCAG 2.1 SC 2.1.2
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
      {/* ── Drawer panel ──────────────────────────────────────────────── */}
      <aside
        ref={drawerRef}
        id="mobile-nav-drawer"
        aria-label="Navigation menu"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
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

          {/* Signed-in user card — gives the username a natural home in the
              drawer, removing any ambiguity about who is signed in. */}
          {user && (
            <div className="px-3 py-2 mb-2 rounded bg-dota-overlay border border-dota-border">
              <p className="font-barlow text-xs text-dota-text-muted tracking-widest uppercase mb-0.5">
                Signed in as
              </p>
              <p className="font-barlow font-semibold text-dota-gold">{user.username}</p>
            </div>
          )}

          {user ? (
            <>
              <Link
                href="/dashboard"
                onClick={onClose}
                className={mobileNavLink('/dashboard', pathname)}
              >
                Dashboard
              </Link>

              <Link
                href="/profile"
                onClick={onClose}
                className={mobileNavLink('/profile', pathname)}
              >
                Profile
              </Link>

              <Link
                href="/changelog"
                onClick={onClose}
                className={mobileNavLink('/changelog', pathname)}
              >
                <ScrollText className="w-3.5 h-3.5" aria-hidden="true" />
                Changelog
                {hasUnseen && (
                  // "New" text label instead of just a dot — more legible in
                  // the drawer context where there's space for it.
                  <span
                    aria-label="New changelog entries"
                    className="ml-auto flex items-center gap-1 font-barlow text-xs font-bold text-dota-gold"
                  >
                    <VisualBadgeDot className="w-1.5 h-1.5" />
                    New
                  </span>
                )}
              </Link>

              {/* Sign out — full-width to match the nav links above it.
                  showConfirm guards against accidental taps on touch screens. */}
              <div className="mt-2 pt-2 border-t border-dota-border">
                <LogoutButton
                  showConfirm
                  className={
                    'w-full px-3 py-2.5 rounded font-barlow font-semibold text-sm ' +
                    'tracking-widest uppercase text-dota-text-muted hover:text-dota-gold ' +
                    'hover:bg-dota-overlay transition-all flex items-center gap-2'
                  }
                />
              </div>
            </>
          ) : (
            // Logged-out users: only the dashboard link is accessible.
            // Auth pages handle their own navigation.
            <Link
              href="/dashboard"
              onClick={onClose}
              className={mobileNavLink('/dashboard', pathname)}
            >
              Dashboard
            </Link>
          )}
        </nav>
      </aside>

      {/* ── Backdrop overlay ──────────────────────────────────────────── */}
      {/* role="presentation" — visual backdrop only. Escape key (above) is
          the keyboard equivalent of clicking it. A plain div with onClick
          is not keyboard-accessible so we don't pretend it is. */}
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
  const pathname = usePathname();

  // threshold=40 — raised from 8. At 8px incidental scrolls on short pages
  // triggered the transition. 40px requires deliberate scrolling.
  const scrolled  = useScrolled(40);

  // Only fetch when the user is logged in — logged-out users would get 401.
  const hasUnseen = useChangelogBadge(!!user);

  // Ref returns focus to the trigger after the drawer closes (WCAG 2.4.3).
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // ── Scroll lock ────────────────────────────────────────────────────────────
  // Save and restore the previous overflow value rather than unconditionally
  // writing '' on cleanup, which would clobber a modal that also holds a lock.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openMenu = useCallback(() => setMenuOpen(true), []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    // Return focus after the drawer's exit animation (300ms) completes.
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-dota-base/95 backdrop-blur-md shadow-raised border-b border-dota-border'
            : 'bg-dota-base border-b border-dota-border'
        }`}
      >
        {/* Route-aware accent bar: Radiant/Dire on match pages, gold on auth,
            plain border on everything else. */}
        <AccentBar pathname={pathname} />

        {/* Responsive horizontal padding — px-4 sm:px-6 lg:px-8 so the nav
            content aligns with the main content area at all viewport widths. */}
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">

          {/* ── Logo ─────────────────────────────────────────────────────── */}
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
            {/* Full title: sm breakpoint and above */}
            <span className="font-cinzel font-bold text-xl text-dota-gold tracking-wide group-hover:text-dota-gold-light transition-colors hidden sm:block">
              Defence of the Auctions
            </span>
            {/* Short form: xs only — avoids a bare logo image on small phones */}
            <span className="font-cinzel font-bold text-base text-dota-gold tracking-wide group-hover:text-dota-gold-light transition-colors sm:hidden">
              DotA
            </span>
          </Link>

          {/* ── Desktop nav ──────────────────────────────────────────────── */}
          {/* aria-label distinguishes this landmark from the mobile drawer's nav */}
          <nav
            className="hidden sm:flex items-center gap-5"
            aria-label="Main navigation"
          >
            {!authLoading && (
              <DesktopNav
                user={user}
                hasUnseen={hasUnseen}
                pathname={pathname}
              />
            )}
          </nav>

          {/* ── Mobile controls ──────────────────────────────────────────── */}
          <div className="flex items-center gap-2 sm:hidden">
            {/* Standalone changelog shortcut — shown only when:
                  • user is logged in (changelog is auth-gated)
                  • there are unseen entries (otherwise nothing to surface)
                  • the drawer is closed (redundant if drawer is visible)
                The icon alone is hard to recognise for new users; the
                aria-label covers screen readers, but consider replacing this
                with a ring/pulse on the hamburger if the icon proves confusing. */}
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

            {/* Hamburger / close button.
                aria-expanded communicates open/closed state to screen readers.
                aria-controls links the button to the drawer it controls.
                Static aria-label — aria-expanded already conveys state. */}
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

      {/* Mobile drawer rendered outside <header> to avoid z-index clipping */}
      <MobileDrawer
        isOpen={menuOpen}
        onClose={closeMenu}
        user={user}
        hasUnseen={hasUnseen}
        pathname={pathname}
      />
    </>
  );
}
