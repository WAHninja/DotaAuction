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

// ── Auth pages: centred gold glow — neutral, welcoming ──────────────────────
const AUTH_BG_GRADIENT = `
  radial-gradient(
    ellipse 80% 60% at 50% 110%,
    rgba(200, 169, 81, 0.10) 0%,
    transparent 70%
  )
`.trim();

// ── Match page: full Radiant/Dire faction atmosphere ────────────────────────
// Green bleeds from bottom-left (Team 1 / Radiant side),
// red from bottom-right (Team A / Dire side).
const MATCH_BG_GRADIENT = `
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

export default function BodyClassWrapper() {
  const pathname = usePathname();

  const isAuthPage  = pathname === '/register' || pathname === '/login';
  const isMatchPage = pathname.startsWith('/match');
  const isDashboard = !isAuthPage && !isMatchPage;

  if (isMatchPage) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={{ backgroundImage: MATCH_BG_GRADIENT }}
      />
    );
  }

  if (isAuthPage) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={{ backgroundImage: AUTH_BG_GRADIENT }}
      />
    );
  }

  // Dashboard and all other pages — stone texture image with a very dark
  // overlay so the texture reads as depth rather than a competing element.
  // The Radiant/Dire glows are omitted here since the texture itself
  // provides the material quality they were approximating with CSS.
  return (
    <>
      {/* Stone texture base */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[-2] pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/dashboard-background.jpg')" }}
      />
      {/* Dark overlay — brings the texture into the dota-base colour range
          without fully hiding it. 0.55 opacity is the sweet spot: the
          geometric lines remain subtly visible, panels still contrast cleanly. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={{ backgroundColor: 'rgba(13, 17, 23, 0.55)' }}
      />
    </>
  );
}
