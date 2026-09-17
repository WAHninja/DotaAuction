'use client';

// app/components/PageBackground.tsx
//
// Renders a full-screen decorative background layer for each section of the
// app. Renamed from BodyClassWrapper (which implied it set classes on <body>).
//
// Three backgrounds:
//   Auth pages    (/login, /register)  — subtle gold radial glow upward
//   Match pages   (/match/[id])        — Radiant + Dire corner glows
//   Everything else                    — stone texture image with dark overlay
//
// Architecture note:
//   This component is 'use client' because it uses usePathname. An alternative
//   is to move each background into its own route-group layout (server
//   components, no JS cost). The current approach is kept because it allows
//   seamless cross-section transitions without a background flash — the fixed
//   layer persists across navigations while page content swaps around it.
//
// Stacking contract:
//   All layers use `fixed` positioning at z-[-1].
//   This component MUST NOT be wrapped by any element with position !== static.
//   If UserProvider gains a wrapper div with position: relative the backgrounds
//   will stack relative to that ancestor instead of <body> and break silently.
//   UserProvider must remain a React fragment.

import Image       from 'next/image';
import { usePathname } from 'next/navigation';

// ── Design tokens ─────────────────────────────────────────────────────────────
// Raw RGB triplets for use inside rgba() gradient strings.
// Mirror the values in tailwind.config.js — update both if a colour changes.
const COLOR = {
  gold:    '200, 169, 81',   // dota-gold
  radiant: '74,  155, 60',   // dota-radiant
  dire:    '192, 57,  43',   // dota-dire
} as const;

// ── Route constants ───────────────────────────────────────────────────────────
// Trailing slash on matchPrefix: `/match/` not `/match` — so hypothetical
// future routes like /matches or /matchmaking don't inherit the match background.
const ROUTES = {
  auth:        ['/login', '/register'] as const,
  matchPrefix: '/match/',
} as const;

// ── Gradient definitions ──────────────────────────────────────────────────────
// At module level — not reconstructed on every render.

// Single upward gold glow — warmth and possibility for new users.
const AUTH_BG_GRADIENT =
  `radial-gradient(ellipse 80% 60% at 50% 110%, rgba(${COLOR.gold}, 0.10) 0%, transparent 70%)`;

// Radiant (green, bottom-left) vs Dire (red, bottom-right) corner tension,
// with a faint gold crown at the top — mirrors the in-game map orientation.
//
// These now sit ON TOP of the shared background image rather than on flat
// dota-base, so the alphas are raised (0.14 -> 0.20): a tint that reads clearly
// against near-black gets lost against a mid-tone photograph.
const MATCH_GLOW_GRADIENT = [
  `radial-gradient(ellipse 70% 55% at 0%   100%, rgba(${COLOR.radiant}, 0.20) 0%, transparent 65%)`,
  `radial-gradient(ellipse 70% 55% at 100% 100%, rgba(${COLOR.dire},    0.20) 0%, transparent 65%)`,
  `radial-gradient(ellipse 50% 30% at 50% 0%,    rgba(${COLOR.gold},    0.06) 0%, transparent 60%)`,
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

  // ── Shared image background (dashboard, match, profile, changelog, …) ──────
  //
  // Single positioned container — the Next.js Image and the darkening overlay
  // share one stacking context at z-[-1]. The previous version used two
  // separate elements at z-[-2] and z-[-1], requiring an extra DOM node and
  // making the image/overlay relationship less obvious.
  //
  // Why <Image> instead of CSS background-image:
  //   • Automatically served as WebP/AVIF — typically 60–80% smaller than JPEG
  //   • Correct cache-control headers via the Next.js image pipeline
  //   • No layout shift — fill covers the container immediately on paint
  //
  // Why no `priority`:
  //   • This image is purely decorative and sits at z-[-1] behind all content
  //   • It is never the Largest Contentful Paint element
  //   • `priority` injects a <link rel="preload"> that competes with logo,
  //     team images, and gold icon already preloaded in layout.tsx
  //   • The dark overlay (bg-dota-base/55) makes any brief load delay invisible
  return (
    <div aria-hidden="true" className="fixed inset-0 z-[-1] pointer-events-none">
      <Image
        src="/dashboard-background.jpg"
        alt=""
        fill
        quality={85}
        // sizes="100vw" is accurate for a full-screen background and suppresses
        // the Next.js dev warning about missing sizes on fill images.
        sizes="100vw"
        className="object-cover object-center"
      />
      {/*
        Darkening overlay. Lowered from /55 to /40 to let more of the artwork
        through. Uses the Tailwind design token rather than a hardcoded rgba so
        it tracks dota-base if that changes in tailwind.config.js.

        Body copy sits on .panel surfaces which have their own opaque metal
        fill, so contrast is unaffected; only bare-on-background text (page
        headings) touches this layer. /40 keeps that comfortably above 7:1.
      */}
      <div className="absolute inset-0 bg-dota-base/40" />

      {/*
        Inner vignette. globals.css already paints one on body::before, but that
        pseudo-element and this container are both at z-index -1, so tree order
        wins and this container covers it. Re-applying it here keeps the edges
        weighted while the centre stays bright — which is what lets the overlay
        above run as light as /40 without the page feeling flat.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/*
        Match pages keep their Radiant/Dire identity — the corner glows are now
        a layer over the shared image instead of a separate background.
      */}
      {isMatchPage && (
        <div
          className="absolute inset-0"
          style={{ backgroundImage: MATCH_GLOW_GRADIENT }}
        />
      )}
    </div>
  );
}
