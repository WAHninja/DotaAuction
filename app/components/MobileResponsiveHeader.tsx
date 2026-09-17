'use client';

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
import type { ElementType } from 'react';
import { Menu, X, ScrollText, User, LayoutDashboard, ChevronDown, BarChart3 } from 'lucide-react';
import { UserContext }          from '@/app/context/UserContext';
import LogoutButton             from './LogoutButton';
import PlayerAvatar             from './PlayerAvatar';
import { useChangelogBadge }    from '@/app/hooks/useChangelogBadge';
import { useFocusTrap }         from '@/app/hooks/useFocusTrap';
import { useScrolled }          from '@/app/hooks/useScrolled';

// =============================================================================
// Style constants
// =============================================================================

const DESKTOP_LINK =
  'font-barlow font-semibold text-sm tracking-widest uppercase ' +
  'text-dota-text-muted hover:text-dota-gold transition-colors';

const DESKTOP_LINK_ACTIVE =
  'font-barlow font-semibold text-sm tracking-widest uppercase ' +
  'text-dota-gold border-b border-dota-gold/50 pb-0.5 transition-colors';

const MOBILE_LINK =
  'px-3 py-2.5 rounded font-barlow font-semibold text-sm tracking-widest uppercase ' +
  'text-dota-text-muted hover:text-dota-gold hover:bg-dota-overlay transition-all ' +
  'flex items-center gap-2';

const MOBILE_LINK_ACTIVE =
  'px-3 py-2.5 rounded font-barlow font-semibold text-sm tracking-widest uppercase ' +
  'text-dota-gold bg-dota-overlay/60 transition-all ' +
  'flex items-center gap-2';

const DROPDOWN_ITEM =
  'w-full flex items-center gap-2.5 px-3 py-2 rounded font-barlow font-semibold ' +
  'text-sm tracking-widest uppercase text-dota-text-muted hover:text-dota-gold ' +
  'hover:bg-dota-overlay transition-all text-left';

const DROPDOWN_ITEM_ACTIVE =
  'w-full flex items-center gap-2.5 px-3 py-2 rounded font-barlow font-semibold ' +
  'text-sm tracking-widest uppercase text-dota-gold bg-dota-overlay/60 transition-all text-left';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Every navigation destination, declared once.
 *
 * This header renders its navigation three times — desktop bar, account
 * dropdown, mobile drawer — and each used to carry its own hand-written copy of
 * every link. A new destination meant three edits, and missing one produced a
 * link that existed on desktop but not mobile, or vice versa. Adding Stats hit
 * exactly that.
 *
 * `placement` decides which of the three a link appears in: primary links sit
 * in the desktop bar, account links in the dropdown, and the mobile drawer
 * shows both because it has no such distinction.
 *
 * Two links are deliberately not here. The signed-out drawer offers Dashboard
 * alone, and the small-screen changelog shortcut is an icon with a badge rather
 * than a labelled destination — both are one-offs that a shared list would only
 * make harder to read.
 */
type NavItem = {
  href: string;
  label: string;
  icon: ElementType;
  /** Desktop bar, or behind the avatar menu. The drawer shows both. */
  placement: 'primary' | 'account';
  /** Marks the item that carries the unseen-changelog indicator. */
  showsUnseenBadge?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, placement: 'primary' },
  { href: '/stats',     label: 'Stats',     icon: BarChart3,       placement: 'primary' },
  { href: '/profile',   label: 'Profile',   icon: User,            placement: 'account' },
  { href: '/changelog', label: 'Changelog', icon: ScrollText,      placement: 'account', showsUnseenBadge: true },
];

const PRIMARY_ITEMS = NAV_ITEMS.filter(i => i.placement === 'primary');
const ACCOUNT_ITEMS = NAV_ITEMS.filter(i => i.placement === 'account');

function navLink(href: string, pathname: string, exact = true): string {
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return isActive ? DESKTOP_LINK_ACTIVE : DESKTOP_LINK;
}

function mobileNavLink(href: string, pathname: string, exact = true): string {
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return isActive ? MOBILE_LINK_ACTIVE : MOBILE_LINK;
}

function dropdownItemClass(href: string, pathname: string, exact = true): string {
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return isActive ? DROPDOWN_ITEM_ACTIVE : DROPDOWN_ITEM;
}

// =============================================================================
// Sub-components
// =============================================================================

function VisualBadgeDot({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ animationIterationCount: 1 }}
      className={`rounded-full bg-dota-gold shadow-gold animate-ping ${className}`}
    />
  );
}

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

type NavUser = { username: string; steam_avatar?: string | null } | null;

// =============================================================================
// DesktopPrimaryLinks — Dashboard + Stats
// =============================================================================

type DesktopPrimaryLinksProps = {
  pathname: string;
};

function DesktopPrimaryLinks({ pathname }: DesktopPrimaryLinksProps) {
  return (
    <>
      {PRIMARY_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`${navLink(href, pathname)} flex items-center gap-1.5`}
        >
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </>
  );
}

// =============================================================================
// UserMenuDropdown — avatar button + flyout with Profile, Changelog, Logout
// =============================================================================

type UserMenuDropdownProps = {
  user:      NonNullable<NavUser>;
  hasUnseen: boolean;
  pathname:  string;
};

function UserMenuDropdown({ user, hasUnseen, pathname }: UserMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef    = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  // Close on navigation (e.g. after logout redirects to /login)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={containerRef} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`User menu for ${user.username}`}
        className={`
          relative flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full
          border transition-all duration-150
          ${open
            ? 'border-dota-gold/60 bg-dota-overlay shadow-gold'
            : 'border-dota-border hover:border-dota-gold/40 bg-dota-overlay hover:bg-dota-raised'
          }
        `}
      >
        {/* Avatar — Steam image if linked, coloured initials fallback */}
        <PlayerAvatar
          username={user.username}
          steamAvatar={user.steam_avatar}
          size={28}
        />

        <span className="font-barlow font-semibold text-sm tracking-widest uppercase text-dota-text-muted hidden lg:block">
          {user.username}
        </span>

        <ChevronDown
          className={`w-3 h-3 text-dota-text-dim transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />

        {/* Unseen badge dot on the avatar */}
        {hasUnseen && (
          <>
            <VisualBadgeDot className="absolute top-0 right-0 w-2 h-2" />
            <span className="sr-only">(new changelog entries available)</span>
          </>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="menu"
          aria-label="User menu"
          className="
            absolute right-0 mt-2 w-52 z-50
            bg-dota-raised border border-dota-border-bright rounded-lg shadow-raised
            py-1.5
            animate-fadeIn
          "
        >
          {/* Username header */}
          <div className="px-3 py-2 mb-1 border-b border-dota-border">
            <p className="font-barlow text-xs text-dota-text-muted tracking-widest uppercase mb-0.5">
              Signed in as
            </p>
            <p className="font-barlow font-bold text-dota-gold truncate">{user.username}</p>
          </div>

          {ACCOUNT_ITEMS.map(({ href, label, icon: Icon, showsUnseenBadge }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={dropdownItemClass(href, pathname)}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {label}
              {showsUnseenBadge && hasUnseen && (
                <span className="ml-auto flex items-center gap-1 font-barlow text-xs font-bold text-dota-gold">
                  <span className="w-1.5 h-1.5 rounded-full bg-dota-gold" aria-hidden="true" />
                  New
                </span>
              )}
            </Link>
          ))}

          <div className="mt-1 pt-1 border-t border-dota-border">
            <LogoutButton
              className={DROPDOWN_ITEM}
              showConfirm
            />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DesktopNav — spacer first, then primary links, then user cluster
// =============================================================================

type DesktopNavProps = {
  user:      NavUser;
  hasUnseen: boolean;
  pathname:  string;
};

function DesktopNav({ user, hasUnseen, pathname }: DesktopNavProps) {
  if (!user) return null;

  return (
    <>
      {/* Spacer pushes everything to the right */}
      <span className="flex-1" />

      {/* Primary nav links — Dashboard + Scribbles, right-aligned before avatar */}
      <DesktopPrimaryLinks pathname={pathname} />

      <UserMenuDropdown user={user} hasUnseen={hasUnseen} pathname={pathname} />
    </>
  );
}

// =============================================================================
// MobileDrawer — structurally unchanged
// =============================================================================

type MobileDrawerProps = {
  isOpen:    boolean;
  onClose:   () => void;
  user:      NavUser;
  hasUnseen: boolean;
  pathname:  string;
};

function MobileDrawer({ isOpen, onClose, user, hasUnseen, pathname }: MobileDrawerProps) {
  const drawerRef = useFocusTrap<HTMLElement>(isOpen);

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

        <nav aria-label="Mobile navigation" className="flex flex-col gap-1 p-4">

          {user && (
            <div className="px-3 py-2 mb-2 rounded bg-dota-overlay border border-dota-border flex items-center gap-3">
              <PlayerAvatar
                username={user.username}
                steamAvatar={user.steam_avatar}
                size={32}
              />
              <div className="min-w-0">
                <p className="font-barlow text-xs text-dota-text-muted tracking-widest uppercase mb-0.5">
                  Signed in as
                </p>
                <p className="font-barlow font-semibold text-dota-gold truncate">{user.username}</p>
              </div>
            </div>
          )}

          {user ? (
            <>
              {/* The drawer shows every destination — it has no bar/menu split
                  to honour, so primary and account links sit together in the
                  order NAV_ITEMS declares them. */}
              {NAV_ITEMS.map(({ href, label, icon: Icon, showsUnseenBadge }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={mobileNavLink(href, pathname)}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {label}
                  {showsUnseenBadge && hasUnseen && (
                    <span
                      aria-label="New changelog entries"
                      className="ml-auto flex items-center gap-1 font-barlow text-xs font-bold text-dota-gold"
                    >
                      <VisualBadgeDot className="w-1.5 h-1.5" />
                      New
                    </span>
                  )}
                </Link>
              ))}

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
            <Link
              href="/dashboard"
              onClick={onClose}
              className={mobileNavLink('/dashboard', pathname)}
            >
              <LayoutDashboard className="w-3.5 h-3.5" aria-hidden="true" />
              Dashboard
            </Link>
          )}
        </nav>
      </aside>

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

// =============================================================================
// MobileResponsiveHeader
// =============================================================================

export default function MobileResponsiveHeader() {
  const { user, loading: authLoading } = useContext(UserContext);
  const [menuOpen, setMenuOpen]        = useState(false);
  const pathname = usePathname();

  const scrolled  = useScrolled(40);
  const hasUnseen = useChangelogBadge(!!user);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen]);

  const openMenu  = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-dota-base/95 backdrop-blur-md shadow-raised border-b border-dota-border'
            : 'bg-dota-base border-b border-dota-border'
        }`}
      >
        <AccentBar pathname={pathname} />

        {/*
          Layout: [Logo ----spacer---- PrimaryLinks | UserMenu] on desktop
          The spacer is rendered inside DesktopNav so the logo stays anchored left.
        */}
        <div className="max-w-7xl mx-auto flex items-center px-4 sm:px-6 lg:px-8 py-3 gap-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <Image
              src="/logo.png"
              alt="Defence of the Auctions"
              width={100}
              height={34}
              priority
              sizes="100px"
              className="object-contain"
            />
            <span className="font-cinzel font-bold text-xl text-dota-gold tracking-wide group-hover:text-dota-gold-light transition-colors hidden sm:block">
              Defence of the Auctions
            </span>
            <span className="font-cinzel font-bold text-base text-dota-gold tracking-wide group-hover:text-dota-gold-light transition-colors sm:hidden">
              DotA
            </span>
          </Link>

          {/* Desktop nav — hidden on mobile */}
          <nav
            className="hidden sm:flex flex-1 items-center gap-5"
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

          {/* Mobile controls — hamburger (+ unseen dot shortcut) */}
          <div className="flex items-center gap-2 sm:hidden ml-auto">
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
