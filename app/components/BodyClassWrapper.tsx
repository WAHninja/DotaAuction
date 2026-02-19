'use client';

import { usePathname } from 'next/navigation';

// ── Background definitions ──────────────────────────────────────────────────
//
// Replaces the old bg-smoke.jpg / static image approach with pure CSS.
// Each context gets a layered radial gradient tuned to that page's mood.
//
// Auth pages (login/register):
//   Single warm gold radial from centre — welcoming, neutral between factions.
//
// Match pages (/match/*):
//   Radiant (green) bleeds from bottom-left, Dire (red) from bottom-right.
//   This mirrors the Dota 2 loading screen faction aesthetic and reinforces
//   the Team 1 / Team A split already present in the UI.
//
// Dashboard and all other pages:
//   Subtle dual-faction glow, less intense than the match page — present
//   but not competing with the content.

const AUTH_BACKGROUND = `
  radial-gradient(
    ellipse 80% 60% at 50% 110%,
    rgba(200, 169, 81, 0.10) 0%,
    transparent 70%
  )
`.trim();

const MATCH_BACKGROUND = `
  radial-gradient(
    ellipse 70% 55% at 0% 100%,
    rgba(74, 155, 60, 0.14) 0%,
    transparent 65%
  ),
  radial-gradient(
    ellipse 70% 55% at 100% 100%,
    rgba(192, 57, 43, 0.14) 0%,
    transparent 65%
  ),
  radial-gradient(
    ellipse 50% 30% at 50% 0%,
    rgba(200, 169, 81, 0.04) 0%,
    transparent 60%
  )
`.trim();

const DEFAULT_BACKGROUND = `
  radial-gradient(
    ellipse 60% 40% at 10% 100%,
    rgba(74, 155, 60, 0.07) 0%,
    transparent 60%
  ),
  radial-gradient(
    ellipse 60% 40% at 90% 100%,
    rgba(192, 57, 43, 0.07) 0%,
    transparent 60%
  )
`.trim();

export default function BodyClassWrapper() {
  const pathname = usePathname();

  const isAuthPage  = pathname === '/register' || pathname === '/login';
  const isMatchPage = pathname.startsWith('/match');

  const backgroundImage = isAuthPage
    ? AUTH_BACKGROUND
    : isMatchPage
    ? MATCH_BACKGROUND
    : DEFAULT_BACKGROUND;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[-1] pointer-events-none"
      style={{ backgroundImage }}
    />
  );
}
