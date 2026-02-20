/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {

      // -----------------------------------------------------------------------
      // Typography
      // Cinzel       — display headings (match titles, game numbers, rules)
      // Barlow Condensed — UI chrome (labels, stats, buttons, table headers)
      // sans         — body copy, prose (fallback system stack)
      // -----------------------------------------------------------------------
      fontFamily: {
        cinzel:  ['var(--font-cinzel)'],
        barlow:  ['var(--font-barlow)'],
      },

      // -----------------------------------------------------------------------
      // Colour system
      //
      // Named after the layer they sit at, not the raw hue, so swapping a
      // shade later only requires changing this file.
      //
      // Tier 1 — backgrounds (darkest)
      // Tier 2 — surfaces / panels
      // Tier 3 — elevated panels / cards
      // Tier 4 — borders, dividers
      // Tier 5 — text, icons, interactive
      //
      // All values cross-referenced against Dota 2's actual client palette.
      // -----------------------------------------------------------------------
      colors: {

        // ── Backgrounds ───────────────────────────────────────────────────────
        // The Dota 2 client uses a cool near-black with a slight blue-navy bias,
        // not the warm grays currently used throughout the app.
        'dota-base':    '#0d1117',   // page background — deeper than current gray-950
        'dota-deep':    '#111827',   // secondary background areas

        // ── Surfaces / Panels ─────────────────────────────────────────────────
        // Dota's in-game panels are layered — each level slightly lighter.
        'dota-surface':  '#1a2035',  // primary panel background (cards, modals)
        'dota-raised':   '#1e2740',  // elevated elements (dropdowns, hover states)
        'dota-overlay':  '#252f45',  // further elevated (selected items, active state)

        // ── Borders ───────────────────────────────────────────────────────────
        'dota-border':   '#2e3d56',  // default border — cool, subtle
        'dota-border-bright': '#3d5470', // hover / focus borders

        // ── Gold — the primary accent ─────────────────────────────────────────
        // Dota's gold is warm amber, not the lime-yellow currently in use.
        // Used for headings, CTAs, important values, and the gold coin icon.
        'dota-gold':     '#c8a951',  // primary gold — matches in-game gold text
        'dota-gold-light': '#dfc06a', // lighter — hover states, highlights
        'dota-gold-dark':  '#9a7d35', // darker — pressed states, muted gold

        // ── Radiant (Team 1) ──────────────────────────────────────────────────
        // The Sentinel/Radiant faction — green. Replaces the current lime palette.
        // More saturated and readable than #598307; matches the Radiant HUD colour.
        'dota-radiant':        '#4a9b3c',  // primary Radiant green
        'dota-radiant-light':  '#6ab85a',  // text, highlights
        'dota-radiant-subtle': '#1a2e1a',  // panel tints (team card background)
        'dota-radiant-border': '#2d5c2a',  // border on Radiant-tinted panels

        // ── Dire (Team A) ─────────────────────────────────────────────────────
        // The Scourge/Dire faction — red. Replaces the current red palette.
        'dota-dire':        '#c0392b',  // primary Dire red — matches Dire HUD
        'dota-dire-light':  '#e05040',  // text, highlights
        'dota-dire-subtle': '#2a1a1a',  // panel tints (team card background)
        'dota-dire-border': '#5c2020',  // border on Dire-tinted panels

        // ── Status colours ────────────────────────────────────────────────────
        // These replace the ad-hoc green-500/red-400/blue-500 usages scattered
        // across components. Everything goes through these tokens.
        'dota-success':  '#4a9b3c',   // same as Radiant — wins, accepted, positive
        'dota-danger':   '#c0392b',   // same as Dire — errors, rejected, negative
        'dota-warning':  '#c8a951',   // same as gold — pending, caution
        'dota-info':     '#4d7bb5',   // neutral blue — in progress, informational

        // ── Offer tier colours ────────────────────────────────────────────────
        // Kept visually distinct from the team colours so tiers don't suggest
        // Radiant/Dire allegiance. Blue/amber/red mirrors Dota's item quality tiers.
        'tier-low':    '#4d7bb5',   // blue — lower-end offers
        'tier-medium': '#c8a951',   // gold/amber — mid-range (reuses dota-gold)
        'tier-high':   '#c0392b',   // red — high offers (reuses dota-dire)

        // ── Text ──────────────────────────────────────────────────────────────
        // Dota uses a warm off-white for primary text, not pure white.
        // This improves readability on the dark backgrounds.
        'dota-text':        '#e8e0d0',  // primary body text — warm off-white
        'dota-text-muted':  '#8a8f99',  // secondary / labels
        'dota-text-dim':    '#555d6b',  // disabled / placeholder

        // ── Legacy aliases ────────────────────────────────────────────────────
        // Kept temporarily so existing components that use the old names don't
        // break before they're migrated. Remove once Stage 3 is complete.
        background: '#0d1117',
        surface:    '#1a2035',
        hud:        '#252f45',
        cooldown:   '#2e3d56',
        gold:       '#c8a951',
        goldDark:   '#9a7d35',
        radiant: {
          green: '#4a9b3c',
          light: '#6ab85a',
        },
        dire: {
          red:  '#c0392b',
          dark: '#8b2020',
        },
        // Kept in case any component references these directly
        winner:  '#4a9b3c',
        loser:   '#c0392b',
        pending: '#4d7bb5',
      },

      // -----------------------------------------------------------------------
      // Border radius
      // Dota 2 uses slightly sharper corners than typical modern UI.
      // We standardise on 3 levels: tight (2px), default (6px), card (10px).
      // -----------------------------------------------------------------------
      borderRadius: {
        sm:  '2px',   // tight — badges, tags, status pills
        DEFAULT: '6px',
        md:  '6px',   // default — buttons, inputs
        lg:  '10px',  // cards, panels
        xl:  '14px',  // modals, large containers
        '2xl': '18px', // hero elements only
        full: '9999px',
      },

      // -----------------------------------------------------------------------
      // Box shadow
      // Dota uses dark inset/drop shadows with coloured glow on hover/focus.
      // -----------------------------------------------------------------------
      boxShadow: {
        // Panel shadows — subtle depth on cards
        panel:  '0 2px 8px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4)',
        raised: '0 4px 16px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.5)',

        // Coloured glows — used on focused/active interactive elements
        gold:    '0 0 0 2px rgba(200,169,81,0.4)',
        radiant: '0 0 0 2px rgba(74,155,60,0.4)',
        dire:    '0 0 0 2px rgba(192,57,43,0.4)',
        info:    '0 0 0 2px rgba(77,123,181,0.4)',

        // Inner shadow for pressed/inset states
        inset:   'inset 0 2px 4px rgba(0,0,0,0.5)',
      },

      // -----------------------------------------------------------------------
      // Spacing
      // No changes to the default scale — Tailwind's 4px base is fine.
      // -----------------------------------------------------------------------

      // -----------------------------------------------------------------------
      // Background image
      // Subtle noise texture used on panels to add material depth,
      // consistent with Dota 2's leather/worn-metal panel aesthetic.
      // -----------------------------------------------------------------------
      backgroundImage: {
        'panel-noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
        'radiant-fade': 'linear-gradient(135deg, rgba(74,155,60,0.08) 0%, transparent 60%)',
        'dire-fade':    'linear-gradient(135deg, rgba(192,57,43,0.08) 0%, transparent 60%)',
        'gold-fade':    'linear-gradient(180deg, rgba(200,169,81,0.06) 0%, transparent 50%)',
      },

    },
  },
  plugins: [],
}
