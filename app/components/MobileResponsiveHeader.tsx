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
import { Menu, X, ScrollText, User, LayoutDashboard } from 'lucide-react';
import { UserContext }          from '@/app/context/UserContext';
import LogoutButton             from './LogoutButton';
import { useChangelogBadge }    from '@/app/hooks/useChangelogBadge';
import { useFocusTrap }         from '@/app/hooks/useFocusTrap';
import { useScrolled }          from '@/app/hooks/useScrolled';

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

function navLink(href: string, pathname: string, exact = true): string {
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return isActive ? DESKTOP_LINK_ACTIVE : DESKTOP_LINK;
}

function mobileNavLink(href: string, pathname: string, exact = true): string {
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return isActive ? MOBILE_LINK_ACTIVE : MOBILE_LINK;
}

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
      <Link
        href="/dashboard"
        className={`${navLink('/dashboard', pathname)} flex items-center gap-1.5`}
      >
        <LayoutDashboard className="w-3.5 h-3.5" aria-hidden="true" />
        Dashboard
      </Link>

      <Link
        href="/profile"
        className={`${navLink("/profile", pathname)} flex items-center gap-1.5`}
      >
        <User className="w-3.5 h-3.5" aria-hidden="true" />
        {user.username}
      </Link>

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

      <span aria-hidden="true" className="w-px h-4 bg-dota-border mx-1" />

      <LogoutButton />
    </>
  );
}

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
                <LayoutDashboard className="w-3.5 h-3.5" aria-hidden="true" />
                Dashboard
              </Link>

              <Link
                href="/profile"
                onClick={onClose}
                className={mobileNavLink('/profile', pathname)}
              >
                <User className="w-3.5 h-3.5" aria-hidden="true" />
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
                  <span
                    aria-label="New changelog entries"
                    className="ml-auto flex items-center gap-1 font-barlow text-xs font-bold text-dota-gold"
                  >
                    <VisualBadgeDot className="w-1.5 h-1.5" />
                    New
                  </span>
                )}
              </Link>

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

  const openMenu = useCallback(() => setMenuOpen(true), []);

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

        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">

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
            <span className="font-cinzel font-bold text-xl text-dota-gold tracking-wide group-hover:text-dota-gold-light transition-colors hidden sm:block">
              Defence of the Auctions
            </span>
            <span className="font-cinzel font-bold text-base text-dota-gold tracking-wide group-hover:text-dota-gold-light transition-colors sm:hidden">
              DotA
            </span>
          </Link>

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

          <div className="flex items-center gap-2 sm:hidden">
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
