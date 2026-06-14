<div align="center">

# 🎵 Encore

**Hear it. Name it. Date it.**

A multiplayer music-guessing party game. Players hear a ~30-second song clip and
race to guess its **title**, **artist**, and **release year** for points across
10 rounds, with Kahoot's pace and accessibility in a music-app shell.

`v0.1.0` · TypeScript end-to-end · runs at **$0** on free tiers

</div>

---

## Table of contents

- [Introduction](#introduction)
- [Live app](#live-app)
- [Technology overview](#technology-overview)
- [Versioning & dependencies](#versioning--dependencies)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & installation](#setup--installation)
- [Initialization: the backend](#initialization-the-backend)
- [Running locally](#running-locally)
- [Content creation: baking the playlists](#content-creation-baking-the-playlists)
- [How to play](#how-to-play)
- [Deployment](#deployment)
- [Security & secrets](#security--secrets)
- [iOS](#ios)
- [Available scripts](#available-scripts)
- [Troubleshooting](#troubleshooting)
- [Scope & known limitations](#scope--known-limitations)
- [License](#license)

---

## Introduction

Encore is a real-time, **server-authoritative** party game for **1–12 players**.
A host creates a private "Friends" lobby and shares a short join code. Guests
join with a display name and a preset avatar (no accounts). The host picks one
of three curated playlists and starts a **Classic** 10-round game.

Each round, a ~30-second clip plays **in sync on every device**. Players answer:

- **Title**: 5-option multiple choice
- **Artist**: 5-option multiple choice
- **Year**: an interactive scrolling wheel

Scoring is computed **only on the server** (clients never see the correct
answers before the reveal): Title **+1**, Artist **+2**, Year **+3** exact or
**+1** within a 2-year band. A live scoreboard updates each round, and a podium
crowns the top 3 at the end.

The full product specification lives in [`encore_v0_spec.md`](./encore_v0_spec.md)
and is the source of truth for scope, data model, game logic, and the visual
system.

---

## Live app

> 🚧 **Not yet deployed.** Once the production deployment is connected
> (see [Deployment](#deployment)), the public URL will go here:
>
> **▶︎ `https://<your-app>.vercel.app`** *(placeholder, replace after deploy)*

Until then, follow [Running locally](#running-locally) to play on your machine.

---

## Technology overview

Every choice optimizes for easy setup, ~$0 cost at friends-scale, good MVP
performance, and **one language (TypeScript) end-to-end**.

| Layer | Technology | Role |
|---|---|---|
| **Client (Web + iOS)** | [Expo](https://expo.dev) (React Native + React Native Web) | One codebase compiles to web **and** iOS. File-based routing via Expo Router. |
| **Audio** | [`expo-audio`](https://docs.expo.dev/versions/latest/sdk/audio/) | Plays a Deezer preview (a plain 30s MP3 URL) on web + iOS. |
| **Backend** | [Convex](https://convex.dev) | A single managed backend bundling a **reactive database**, **server-side functions**, **realtime subscriptions**, and **scheduling/cron**. Gives us server-authoritative game logic + realtime sync with no WebSocket server to run. |
| **Music data** | [Deezer API](https://developers.deezer.com/api) + [MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API) | Deezer supplies free 30s preview MP3s + metadata (no per-user login). MusicBrainz supplies the **original** release year. Both called server-side from Convex actions at pre-bake time. |
| **Web hosting** | [Vercel](https://vercel.com) | Hosts the Expo web export; push-to-deploy from GitHub. Convex connects via the Vercel marketplace integration. |
| **iOS build (deferred)** | [Expo EAS](https://docs.expo.dev/eas/) | `eas build` produces an iOS binary when desired. App Store submission is out of scope for v0. |

**Why these and not the obvious alternatives** (so they don't get swapped):
Spotify prohibits games and requires Premium per player. A self-hosted WebSocket
server (Colyseus/Socket.IO) can't run on Vercel and adds an always-on server to
operate. Supabase/Firebase would still need a separate place to run authoritative
per-room logic and timers. Convex collapses DB + logic + realtime + scheduling
into one. See spec §2.1 for the full rationale.

---

## Versioning & dependencies

- **App version:** `0.1.0` (v0 MVP)
- **Language:** TypeScript `~6.0`
- **Runtime targets:** modern browsers (web) and iOS via Expo

**Core runtime dependencies** (see [`package.json`](./package.json) for the full,
pinned list):

| Package | Version |
|---|---|
| `expo` | `~56.0.11` |
| `expo-router` | `~56.2.10` |
| `expo-audio` | `~56.0.11` |
| `react` / `react-dom` | `19.2.3` |
| `react-native` | `0.85.3` |
| `react-native-web` | `~0.21.0` |
| `react-native-reanimated` | `4.3.1` |
| `react-native-svg` | `15.15.4` |
| `convex` | `^1.31.0` |
| `@react-native-async-storage/async-storage` | `~2.2.0` |
| `@expo-google-fonts/inter`, `@expo-google-fonts/space-grotesk` | latest 0.4.x |

Versions are aligned to the **Expo SDK 56** matrix. When changing any Expo
package, prefer `npx expo install <pkg>` over `npm install` so the version stays
SDK-compatible.

---

## Project structure

```
encore/
├─ app/                      # Expo Router screens (file-based routing)
│  ├─ _layout.tsx            #   fonts, theme + Convex providers, navigation
│  ├─ index.tsx              #   Home
│  ├─ host.tsx               #   Host setup
│  ├─ join.tsx               #   Join setup
│  ├─ lobby/[code].tsx       #   Lobby (host + player views)
│  └─ game/[code].tsx        #   Round play / reveal / podium
├─ components/               # Styled PRIMITIVES. ALL UI composes these (spec §11)
├─ theme/                    # Design tokens: colors, type, spacing, radius, motion
├─ hooks/                    # useGameClock, useSyncedAudio, useHeartbeat, …
├─ lib/                      # Shared constants + validation (client AND backend)
├─ convex/                   # Backend
│  ├─ schema.ts              #   all tables (spec §4)
│  ├─ lobbies.ts             #   create / join / start / cancel + queries
│  ├─ game.ts                #   round lifecycle, scheduling, authoritative scoring
│  ├─ rounds.ts              #   decoy + year-wheel math (pure functions)
│  ├─ helpers.ts             #   shared server helpers
│  ├─ music/                 #   provider seam + Deezer + MusicBrainz + title cleanup
│  ├─ prebake.ts             #   one-time action to build the default playlists (§9)
│  └─ _generated/            #   Convex-generated, fully-typed bindings (committed)
├─ assets/                   # icons, splash, favicon
├─ .env.example              # variable NAMES only, no values
├─ vercel.json               # Vercel build config
└─ app.json                  # Expo config
```

**DRY backbone:** Convex generates end-to-end types from `schema.ts`, so the
client and server share one type source. Game rules, scoring, and timing
constants live once in [`lib/constants.ts`](./lib/constants.ts); name validation
lives once in [`lib/validation.ts`](./lib/validation.ts). Both are imported by the
client and the backend.

**Visual system:** there is **no per-component ad-hoc styling**. All raw design
values live once in [`theme/`](./theme/index.ts) as semantic tokens (`bg`,
`surface`, `accent`, …), and every screen composes the primitives in
[`components/`](./components) via variant props.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | **≥ 20** (tested on 22.x) | Includes `npm` and `npx`. |
| **npm** | ≥ 10 | Ships with Node. |
| **Git** | any recent | For cloning + deploys. |
| A modern web browser | any | Chrome/Edge/Safari/Firefox. |

For a **production deployment** you will also need (free) accounts:
[Convex](https://convex.dev), [Vercel](https://vercel.com), and a GitHub repo.
None are required to run locally.

---

## Setup & installation

```bash
# 1. Clone and enter the project
git clone <your-repo-url> encore
cd encore

# 2. Install dependencies
npm install
```

That's it for install. Next, initialize the backend.

---

## Initialization: the backend

Encore needs a Convex deployment for the database, realtime sync, and game
logic. The Convex CLI writes the connection URL into a **gitignored**
`.env.local` for you.

```bash
npx convex dev
```

The first time you run this, the CLI will prompt you:

- **Log in / create a project** (opens a browser): recommended for a persistent
  cloud dev deployment, **or**
- choose the **local/anonymous** option to develop entirely on your machine with
  no account.

Either way, leave this command **running**. It watches `convex/`, pushes function
changes live, and keeps `.env.local` populated with `EXPO_PUBLIC_CONVEX_URL`.

> **Heads-up:** a brand-new deployment has **no playlists yet**, so the Host
> screen will show "No playlists yet." Bake the default content once (next-but-one
> section), or run the app first to see the lobby flow.

---

## Running locally

You need **two terminals**, one for the backend and one for the web client.

**Terminal 1 (backend)**, keep it running:

```bash
npx convex dev
```

**Terminal 2 (web client):**

```bash
npm run web
```

Then open the printed URL (default **http://localhost:8081**).

To play a multiplayer game on one machine, open the app in **several browser
tabs/windows** (use separate windows or incognito so each gets its own anonymous
session): host in one, join with the code from the others.

> **Tip:** to play across devices on your LAN, run the web client and open
> `http://<your-computer-ip>:8081` from a phone on the same network.

---

## Content creation: baking the playlists

Game content is **pre-baked** into Convex (not fetched live mid-game), so each
round is a fast DB read. The pre-bake action pulls tracks from Deezer,
resolves each track's **original** release year from MusicBrainz, cleans up
display titles, validates variety, and writes the playlist to Convex.

Run this **once per deployment** (the backend, `npx convex dev`, must be
running). The three curated v0 default playlists (**All-Time Hits**, **Throwback
Party**, **Rock Essentials**) are pre-filled in
[`scripts/prebake.mjs`](./scripts/prebake.mjs), so the convenience scripts do the
work:

```bash
# 1. Identify yourself to MusicBrainz (etiquette, required by their API)
npx convex env set MUSICBRAINZ_USER_AGENT "Encore/0.1 (you@example.com)"

# 2. Dry run: prints variety stats + a year spot-check sample, writes NOTHING
npm run prebake

# 3. Looks good? Commit the playlists to Convex
npm run prebake:commit
```

<details>
<summary>Prefer the raw command (e.g. to bake different playlists)?</summary>

```bash
npx convex run prebake:prebake '{
  "commit": false,
  "sources": [
    {"deezerPlaylistId": "9056972262", "name": "All-Time Hits",  "description": "The biggest songs ever, from every decade.", "tags": ["default","mixed"]},
    {"deezerPlaylistId": "8168569082", "name": "Throwback Party", "description": "Sing-along smashes from the 80s, 90s and 00s.", "tags": ["default","throwback"]},
    {"deezerPlaylistId": "1306931615", "name": "Rock Essentials", "description": "Guitar anthems from the 60s to today.",       "tags": ["default","rock"]}
  ]
}'
```
Flip `"commit"` to `true` to write. Add `--prod` to target production.
</details>

`prebake:commit` enforces the §9 validity rules (≥40 tracks, ≥15 artists,
≥8 distinct years, ≥25-year span, no artist >20%, no year >25%) and refuses to
write a playlist that fails them. The MusicBrainz year lookups are rate-limited
to ~1/sec, so a fresh bake of all three takes several minutes. Results are
cached, so re-running is fast.

---

## How to play

1. **Home** → **Host Game**.
2. Pick a playlist, enter a name (3–16 chars), choose an avatar → **Create Lobby**.
3. Share the **4-character join code** shown in the lobby.
4. Friends open the app → **Join Game** → enter the code, name, avatar.
5. The host taps **Start Match** → a **15-second** countdown (cancelable).
6. Each round: a **3·2·1** sync countdown, then the clip plays. Answer **Title**,
   **Artist**, and **Year** (tab between them), then **Submit**. The round ends at
   the **27-second** timer **or** early once everyone has submitted.
7. See the reveal + scoreboard, then auto-advance. After 10 rounds, the
   **podium** crowns the top 3. The host can **Play Again** with the same group.

A per-device **mute toggle** silences local audio (handy when several phones are
in one room) while keeping the visual countdown.

---

## Deployment

Encore deploys as a static web export on Vercel, with Convex as the backend.

1. **Push** this repository to GitHub.
2. In **Convex**, create/select your **production** deployment and copy a
   **deploy key** from the dashboard (Settings → Deploy keys).
3. In **Vercel**, import the GitHub repo. The build is preconfigured in
   [`vercel.json`](./vercel.json):
   - **Build command:** `npx convex deploy --cmd 'npm run build:web'`
   - **Output directory:** `dist`
   This deploys the Convex functions **and** builds the web client in one step,
   injecting the production `EXPO_PUBLIC_CONVEX_URL` automatically.
4. In **Vercel → Project → Settings → Environment Variables**, add
   **`CONVEX_DEPLOY_KEY`** (the key from step 2). *(Or use the Convex × Vercel
   marketplace integration, which sets this for you.)*
5. **Deploy.** Then bake the default playlists against **production** once:
   ```bash
   npx convex env set MUSICBRAINZ_USER_AGENT "Encore/0.1 (you@example.com)" --prod
   npm run prebake:commit -- --prod
   ```
6. Replace the placeholder in [Live app](#live-app) with your Vercel URL.

**GitHub hardening:** CI, CodeQL, and Dependabot are already configured in
[`.github/`](./.github). Also enable secret scanning + push protection and branch
protection on `main` in the repo settings.

---

## Security & secrets

- The **client is fully untrusted.** No game secret is computed or stored
  client-side. Correct answers live only in the server-only `roundSecrets` table
  and are **never** returned to a client before the reveal.
- **Secrets live only in Convex environment variables** (`npx convex env set`).
  v0 has few. Deezer needs no key, MusicBrainz needs only a User-Agent
  string, and the Convex deploy key is managed by the CLI or Vercel env.
- **`EXPO_PUBLIC_CONVEX_URL` is public by design** and safe to ship in the built
  client. It is the deployment address.
- **Never commit `.env` files.** `.gitignore` excludes `.env` and `.env.*` except
  [`.env.example`](./.env.example), which lists variable **names only**.
- Every mutation is authorized server-side. Host-only actions verify
  `sessionId === hostSessionId`.

---

## iOS

The codebase is **iOS-capable** today via Expo:

```bash
npm run ios   # requires Xcode / a simulator, or the Expo Go app on a device
```

Producing a distributable build uses Expo EAS (`eas build`), and App Store
submission requires an Apple Developer account. Both are deliberately **out of
scope for v0**.

---

## Available scripts

| Script | What it does |
|---|---|
| `npm run web` | Start the Expo dev server for web (http://localhost:8081). |
| `npm run ios` | Start the Expo dev server targeting iOS. |
| `npm start` | Start the Expo dev server (choose platform interactively). |
| `npm run convex:dev` | Run/watch the Convex backend (also creates `.env.local`). |
| `npm run lint` / `npm run lint:fix` | Run ESLint (auto-fix variant). |
| `npm run typecheck` | Run `tsc --noEmit` across the whole project. |
| `npm run build:web` | Produce the production web export into `dist/`. |
| `npm run prebake` | Dry-run the default-playlist bake (stats + year spot-check, writes nothing). |
| `npm run prebake:commit` | Bake the default playlists into Convex. Append `-- --prod` for production. |
| `npm run clean` | Remove build artifacts (`dist/`, `.expo/`, cache). |

---

## Troubleshooting

- **Host screen says "No playlists yet."** The deployment hasn't been baked. Run
  the [content creation](#content-creation-baking-the-playlists) step.
- **"Missing EXPO_PUBLIC_CONVEX_URL" on launch.** `npx convex dev` isn't running,
  or hasn't written `.env.local` yet. Start it, then restart `npm run web`.
- **Audio doesn't play.** Browsers block autoplay until you interact with the
  page. The round shows an "audio unavailable, tap to retry" banner and never
  blocks on audio. Click into the tab, or use the retry banner.
- **MusicBrainz errors during pre-bake.** It's rate-limited. The action paces
  itself and caches progress, so re-run the command to resume.
- **Dependency version conflicts.** Use `npx expo install <pkg>` (not
  `npm install`) so versions match the Expo SDK.

---

## Scope & known limitations

v0 is intentionally minimal (see spec §1.2). **Not** in this version: accounts /
login (all players are guests), public matchmaking or other game modes,
persistent profiles/leaderboards, user-created playlists, avatar generation, and
native App Store submission. Reconnection restores a player within a short grace
window. Rounds missed while disconnected score 0.

---

## License

Private project. Music previews and metadata are used under Deezer's and
MusicBrainz's terms for **non-commercial, personal** use.
