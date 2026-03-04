'use client';

// app/components/PageBackground.tsx
//
// Renders a full-screen decorative background layer for each section of the
// app. Renamed from BodyClassWrapper (which implied it set classes on <body>).
//
// Three backgrounds are in play:
//   Auth pages    (/login, /register)    — subtle gold radial glow upward
//   Match pages   (/match/[id])          — Radiant + Dire corner glows
//   Everything else                      — stone texture image with dark overlay
//
// Architecture note:
//   This component is 'use client' because it uses usePathname. An alternative
//   is to move each background into its own route-group layout (which would
//   make them server components with no JS cost). The current approach is kept
//   because it allows seamless cross-section transitions without a background
//   flash — the fixed layer persists across navigations while page content
//   swaps around it. If that transition smoothness stops mattering, prefer the
//   route-group approach.
//
// Stacking contract:
//   All layers use `fixed` positioning at negative z-index (z-[-1]).
//   This component MUST NOT be wrapped by any element with position !== static.
//   If UserProvider or any other ancestor gains a wrapper with position:relative,
//   the backgrounds will stack relative to that ancestor instead of <body> and
//   break silently. UserProvider must remain a React fragment.

import Image from 'next/image';
import { usePathname } from 'next/navigation';

// ── Design tokens ─────────────────────────────────────────────────────────────
// Raw RGB triplets so they compose cleanly into rgba() gradient strings.
// These mirror the values in tailwind.config.js. If a colour changes in the
// Tailwind config, update it here too — there's no build-time link between the
// two files.
const COLOR = {
  gold:    '200, 169, 81',   // dota-gold
  radiant: '74,  155, 60',   // dota-radiant
  dire:    '192, 57,  43',   // dota-dire
} as const;

// ── Route constants ───────────────────────────────────────────────────────────
// Single source of truth for path matching inside this file.
// Note the trailing slash on MATCH_PREFIX — `/match/` rather than `/match` —
// so hypothetical future routes like /matches or /matchmaking don't accidentally
// inherit the match-page background.
const ROUTES = {
  auth:         ['/login', '/register'] as const,
  matchPrefix:  '/match/',
} as const;

// ── Gradient definitions ──────────────────────────────────────────────────────
// Defined at module level so they aren't reconstructed on every render.
// usePathname() re-renders this component on every navigation; keeping these
// outside the function body means the string allocations happen once.

// Single upward gold glow — suggests warmth and possibility for new users.
const AUTH_BG_GRADIENT =
  `radial-gradient(ellipse 80% 60% at 50% 110%, rgba(${COLOR.gold}, 0.10) 0%, transparent 70%)`;

// Radiant (green, bottom-left) vs Dire (red, bottom-right) corner tension,
// with a faint gold crown at the top — mirrors the in-game map orientation.
const MATCH_BG_GRADIENT = [
  `radial-gradient(ellipse 70% 55% at 0%   100%, rgba(${COLOR.radiant}, 0.14) 0%, transparent 65%)`,
  `radial-gradient(ellipse 70% 55% at 100% 100%, rgba(${COLOR.dire},    0.14) 0%, transparent 65%)`,
  `radial-gradient(ellipse 50% 30% at 50% 0%,    rgba(${COLOR.gold},    0.04) 0%, transparent 60%)`,
].join(', ');

// ── Component ─────────────────────────────────────────────────────────────────

export default function PageBackground() {
  const pathname = usePathname();

  const isAuthPage  = ROUTES.auth.some(route => pathname === route);
  const isMatchPage = pathname.startsWith(ROUTES.matchPrefix);

  // ── Auth background ────────────────────────────────────────────────────────
  if (isAuthPage) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={{ backgroundImage: AUTH_BG_GRADIENT }}
      />
    );
  }

  // ── Match background ───────────────────────────────────────────────────────
  if (isMatchPage) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={{ backgroundImage: MATCH_BG_GRADIENT }}
      />
    );
  }

  // ── Default background (dashboard, profile, changelog, …) ─────────────────
  //
  // Single positioned container — the Next.js Image and the darkening overlay
  // share one stacking context at z-[-1]. The previous implementation used two
  // separate elements at z-[-2] and z-[-1], which required an extra DOM node
  // and made the relationship between image and overlay less obvious.
  //
  // Why <Image> instead of CSS background-image:
  //   • Automatically served as WebP/AVIF — typically 60–80% smaller than JPEG
  //   • Correct cache-control headers via the Next.js image pipeline
  //   • No layout shift — fill covers the container immediately on paint
  //
  // Why no `priority`:
  //   • This image is purely decorative and sits at z-[-1] behind all content
  //   • It is never the Largest Contentful Paint element
  //   • `priority` injects a <link rel="preload"> that competes with the logo,
  //     team images, and gold icon already preloaded in layout.tsx
  //   • The dark overlay (bg-dota-base/55) means any brief load delay is
  //     invisible — the page background starts as the solid base colour and the
  //     texture fades in once downloaded
  return (
    <div aria-hidden="true" className="fixed inset-0 z-[-1] pointer-events-none">
      <Image
        src="/dashboard-background.jpg"
        alt=""
        fill
        quality={85}
        // sizes="100vw" is accurate for a full-screen background and suppresses
        // the Next.js development warning about missing sizes on fill images.
        sizes="100vw"
        className="object-cover object-center"
      />
      {/*
        Darkening overlay — tones the stone texture down to dota-base range.
        bg-dota-base/55 uses the Tailwind design token rather than the raw
        rgba(13, 17, 23, 0.55) that the previous version hardcoded. If
        dota-base changes in tailwind.config.js this overlay updates automatically.
      */}
      <div className="absolute inset-0 bg-dota-base/55" />
    </div>
  );
}
