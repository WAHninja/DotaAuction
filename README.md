# Defence of the Auctions

A player-auction league companion app for Dota 2. Two teams play a series of
games; after every game the losing team's gold is docked, the winners split
the spoils, and then each winner secretly auctions off one of their own
teammates to the losing side. Draft, bid, and betray.

Live stats, per-player performance history, and league standings are built
in alongside the match/auction flow itself.

## How the game works

- A match needs **3 or more players**, split into two teams.
- After each game, the **losing team loses half their gold**. Each
  **winner** gets a flat **1,000 gold**, plus an even split of half the
  losing team's pool.
- An **auction** then runs: every winner secretly submits one offer,
  naming a teammate to sell and a price (within a range that widens as the
  match goes on). Offers — including who's being sold — stay hidden until
  everyone has submitted.
- Once all offers are in, the **losing team** sees each offer only as a
  **Low / Medium / High** tier (tiers overlap, so a "Low" can outbid a
  "Medium"). They accept one offer: the buyer gets the gold, and the sold
  player switches to the losing team.
- The match ends when a team is reduced to **one player and wins a game**,
  or when any player reaches **100,000 gold** (ties are broken by whoever
  has the higher total).

The in-app "Match Rules" card (`app/components/GameRulesCard.tsx`) is the
source of truth for these rules if the game logic and this README ever
drift apart.

## Tech stack

- **Next.js 15** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** for styling
- **PostgreSQL** via `pg`, accessed with raw SQL (no ORM) — see `lib/db.ts`
- **Supabase Realtime** for cross-client sync (offers, winner selection,
  online presence, etc. — see the `use*Listener` hooks under `app/hooks/`)
- Cookie-based sessions (`app/session.ts`), passwords hashed with `bcryptjs`
- Hosted on **Render**, deployed from the `main` branch

## Project structure

```
app/
  api/            REST-ish route handlers (Next.js route.ts files)
  components/     UI components
    stats/        Stats dashboards — league/, player/, ui/ subfolders
  context/        React context providers (user session, online users)
  hooks/          Realtime listeners and small UI hooks
  dashboard/      Dashboard page
  match/[id]/     Live match page (auction house, team cards, history)
  stats/          League and per-player stats pages
lib/
  stats/          Pure stats-computation modules, consumed by app/api/stats
  db.ts           PostgreSQL connection pool
  supabase-*.ts   Supabase clients (browser + server)
  gold-win.ts     Gold distribution / win-threshold logic
  offer-range.ts  Auction offer-range-by-game logic
types/            Shared TypeScript types
public/           Static assets (team logos, backgrounds, icons)
```

## Environment variables

| Variable | Used for |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-side realtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) |
| `STEAM_API_KEY` | Linking a player's Steam profile (`app/api/me/steam`) |
| `INTERNAL_API_SECRET` | Authorises the internal `select-winner` game endpoint |

Copy these into a `.env.local` for local development.

## Getting started

This repo uses **Yarn** — `yarn.lock` is authoritative; avoid committing a
`package-lock.json`.

```bash
yarn install
yarn dev       # http://localhost:3000
```

Other scripts:

```bash
yarn build     # production build
yarn start     # run a production build
```

Node `>=20.11.0` is required (`.node-version` pins the exact version Render
builds with).

## Notes on naming

- `app/api/match/[id]` — a single match by ID.
- `app/api/matches` — the match list (dashboard).

These follow standard Next.js singular-resource-vs-collection routing and
aren't a typo.
