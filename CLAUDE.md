# CLAUDE.md: working notes for Encore

Guidance for any AI/dev session working on Encore. `encore_v0_spec.md` is the
**product** source of truth. This file is the **engineering-process** layer on
top of it. Safe to read and follow in any Claude/agent session. Keep it short
and current. Prune stale items.

## Scope

Applies to the **Encore** repository only. Don't modify unrelated repos or files
outside the current task.

## Local overrides (`CLAUDE.local.md`)

If `CLAUDE.local.md` exists, read it after this file. It is **gitignored** and
holds developer-specific, machine-local details: local paths, personal workflow
and aliases, contact info used for API User-Agents, and personal notes. Each
developer keeps their own. **Do not** put team-wide rules or secrets there. If
something in a local file turns out to be broadly useful, graduate it into this
committed file so the shared notes stay current.

## Orientation (read first)

1. Confirm you're working in this repo only.
2. Read `encore_v0_spec.md` (product spec: scope, data model, game logic, the
   "Spotlight" visual system, acceptance criteria §15), this file, and your
   `CLAUDE.local.md` if present.
3. Check `package.json` for the available scripts and pinned versions before
   running commands.
4. Prefer the project's npm scripts over ad-hoc command chains.

## Runtime & toolchain

- **Stack:** Expo (React Native + React Native Web) · `expo-audio` · Convex
  (DB + realtime + server functions + scheduling) · Deezer + MusicBrainz
  (server-side, pre-bake only) · Vercel (web host). One language: TypeScript.
- **Node:** ≥ 20 (developed on 22.x). **Package manager:** npm
  (`package-lock.json` is committed).
- **Pins:** Expo **SDK 56**, TypeScript `~6.0`, Convex `^1.31`, React 19 /
  React Native 0.85.
- **Adding dependencies:** use `npx expo install <pkg>` (not plain `npm install`)
  for Expo/React-Native packages so versions stay SDK-aligned.

## Preferred commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies. |
| `npm run convex:dev` | Run/watch the Convex backend. Creates `.env.local`, pushes functions, regenerates types. Keep running during dev. |
| `npm run web` | Expo web dev server (http://localhost:8081). |
| `npm run ios` | Expo dev server targeting iOS. |
| `npm run lint` / `npm run lint:fix` | ESLint (auto-fix variant). |
| `npm run typecheck` | `tsc --noEmit` across the project. |
| `npm run build:web` | Production web export to `dist/` (the Vercel build). |
| `npm run prebake` / `npm run prebake:commit` | Dry-run / write the default playlists (append `-- --prod` for production). |
| `npm run clean` | Remove `dist/`, `.expo/`, caches. |

## Standing conventions (enforced requirements, not suggestions)

- **DRY / KISS / YAGNI.** If a style, type, or piece of logic is written twice,
  extract it. Build only what v0 needs (check scope against spec §1.2).
- **No ad-hoc styling.** All design values live once in `theme/` as semantic
  tokens. All UI composes the primitives in `components/` via variant props.
  **Never** put a raw hex/rgba or magic design number in a screen or component
  body. (Quick check: `grep -rnE '#[0-9A-Fa-f]{3,8}|rgba?\(' components/ app/`
  should return nothing.)
- **Server authority.** The client is untrusted. Correct answers live only in
  `roundSecrets` and never reach a client before reveal (rule R6). Every
  host-only mutation verifies `sessionId === lobby.hostSessionId`.
- **Shared types.** Convex generates types from `schema.ts`. Reuse them rather
  than redeclaring shapes. Shared constants/validation live in `lib/` and are
  imported by both client and `convex/`.
- **Locked stack** (Expo · expo-audio · Convex · Deezer+MusicBrainz · Vercel)
  and the locked "Spotlight" visual direction (spec §11). Do not substitute.

## Writing style

Applies to all writing: comments, documentation, commit messages, and
user-facing text. Hold AI-generated writing to the same rules. When unsure how
to word something, fall back on KISS (keep it simple).

- Cut unnecessary adjectives, metaphors, and jargon.
- Do not use em dashes. Avoid semicolons. Prefer two short sentences over one
  joined sentence. Cut unnecessary punctuation.
- Keep sentences short and simple. Avoid run-on and overly long sentences. Avoid
  the three-part sentence pattern AI tends to produce. It gets hard to read.
- Keep documentation high-level. Do not over-explain the implementation.
- Do not over-reference code blocks or symbols. Each extra reference adds
  confusion.
- Cut filler and hedge words: just, simply, basically, obviously, really, very.
- Comment the why, not the what. The code already shows what it does.
- Do not leave commented-out code behind.

### Code comments

- Use JSDoc/TSDoc (`/** ... */`) for exported functions, classes, and non-obvious
  types where it helps. These blocks are exempt from the line limit below.
- Keep other comments to 2 lines, 3 at most.
- Comments follow the rules above, but may use technical terms and brief
  purpose-driven implementation notes.

## Backend & schema workflow (Convex)

- `convex/schema.ts` is the source of truth for all tables and indexes. Define
  new fields and indexes there. `npm run convex:dev` pushes the change and
  regenerates `convex/_generated`.
- **Never hand-edit `convex/_generated/`.** It is regenerated. (It is committed
  because typecheck and build need it.)
- Function kinds: **queries** (reactive reads), **mutations** (transactional
  writes), **actions** (may call external APIs, e.g. `prebake`). Keep secrets
  out of queries/mutations and never return secret data (R6).
- **Secrets live only in Convex env vars** (`npx convex env set NAME value`),
  never in code or the repo. `EXPO_PUBLIC_CONVEX_URL` is public by design.
- Schema edits: additive fields are safe. Removing or renaming fields on live
  data needs care (Convex validators enforce shape). Cascade-delete child docs
  when removing a parent (see `convex/maintenance.ts` for the pattern).

## Linting

ESLint 9 (flat config, `eslint-config-expo`, React Native and Expo aware,
includes the React Compiler hook rules). Run `npm run lint` (or `npm run
lint:fix` to auto-fix). Lint should be **clean before any commit**. Run it at the
end of each changeset too, not only at the final push, so hook and style issues
surface while the context is fresh.

## Testing

Stack:

- **Vitest** runs unit and backend tests (`*.test.ts`). `npm test` runs once,
  `npm run test:watch` is the TDD loop, `npm run test:coverage` adds coverage.
- **convex-test** tests Convex functions against an in-memory backend (no
  deployment). Convex test files start with `// @vitest-environment edge-runtime`.
- **Playwright** runs web E2E in `e2e/` (`npm run test:e2e`).

Rules we enforce:

- **TDD.** For a new behavior or a bug fix, write the failing test first, then
  make it pass.
- **Functional or logical changes carry tests.** Run every affected test, update
  them as needed, and confirm they pass. Confirm coverage (line, branch, and
  function) for the affected areas stays the same or improves. Pure docs or
  config changes may not need tests.
- **Test behaviors and public surface**, and our own logic: scoring, decoy and
  year-wheel math, validation, the round lifecycle, and the R6 secret gating. Do
  not test trivial getters or framework internals.
- **Never skip or weaken a test to make it pass.** Fix the code or ask.

## Continuous integration

GitHub Actions runs on every PR and push to `main` (`.github/`):

- **CI** (`workflows/ci.yml`): parallel matrix of `lint`, `typecheck`, `test`
  (Vitest), and `build:web`, plus `expo-doctor`. A separate `e2e` job runs the
  Playwright suite.
- **CodeQL** (`workflows/codeql.yml`): JS/TS security and quality scanning on
  PRs and weekly.
- **Dependabot** (`dependabot.yml`): weekly npm and GitHub-Actions update PRs.

The CI checks mirror the pre-commit checklist below, so failures surface locally
first. Keep `main` green.

## Versioning policy (check at commit time, not mid-session)

Encore uses semver **MAJOR.MINOR.PATCH** (currently **0.1.0**).

**When:** the version bump is decided **once per changeset**, at the *end* of a
session when changes are staged and about to be committed or pushed. Not at each
step while coding. Before handing off a staged commit, review the whole staged
set (`git diff --cached`) and ask: does this changeset contain real functional or
logical changes?

**Rule:** if yes, bump the version **once** for that changeset (in the same
commit). If a session produces several commits, each commit that ships
functional/logical changes gets its own bump. This keeps versioning honest and
tied to what actually shipped.

- **PATCH** (`0.1.0 → 0.1.1`): bug fixes, small logic changes, refactors,
  security hardening.
- **MINOR** (`0.1.x → 0.2.0`): new user-facing features or capabilities.
- **MAJOR** (`0.x → 1.0.0`): reserved for the first real release milestone
  (see spec). Breaking changes thereafter.

**Do NOT bump** for: adding/curating playlists or other content, pure cosmetic or
theme-token tweaks, comments, or docs/README-only edits.

**Bump these locations in lockstep** (grep `0\.1\.0` to confirm none missed):

1. `package.json` → `"version"`
2. `app.json` → `expo.version`
3. `README.md` → the version badge near the top (``v0.1.0``) **and** the
   "**App version:** `0.1.0`" line under *Versioning & dependencies*

On a **MINOR or MAJOR** bump, also sync the `Encore/X.Y` major.minor in the
MusicBrainz User-Agent (it identifies the app to their API):
`convex/prebake.ts` fallback string, `scripts/prebake.mjs`, and the README
examples. PATCH bumps don't need the User-Agent touched.

> Tip: when in doubt whether a change is "functional," it probably is. Bump
> PATCH. Under-bumping is worse than over-bumping.

## Quick checks (run the smallest relevant first)

- TS/TSX edit → `npm run lint` + `npm run typecheck` + `npm test`.
- Backend change → the convex-test suite (`npm test`) and `npm run convex:dev`.
- UI/behavior change → run the app (`npm run web`) and `npm run test:e2e`.
- Anything that could affect the bundle → `npm run build:web`.

## Checklist when staging a commit (end of session / before a push)

Run this against the **staged changeset**, not after every edit:

- [ ] `npm run lint` is clean (also run it at the end of each changeset).
- [ ] `npm run typecheck` is clean.
- [ ] `npm test` passes, and new behavior or a bug fix has a test.
- [ ] `npm run build:web` succeeds (the Vercel deploy path).
- [ ] No new raw colors / ad-hoc styles (grep above).
- [ ] New repeated logic/markup extracted to `lib/` or a primitive.
- [ ] Reviewed `git diff --cached` for functional/logical changes → if present,
      version bumped once per the policy above.
- [ ] Don't `git commit` or `git push` unless the task explicitly asks. Stage the
      changes and draft the commit message for review.

## Safety constraints

- **Ask before destructive or irreversible actions:** deleting data, resetting or
  dropping the Convex deployment, force-push or git history rewrites, deploys,
  and any write to an external service or account.
- **Don't commit or push unless explicitly asked** in the current task.
- **Treat `.env*`, credentials, and keys as high-risk.** Never commit them.
  Secrets live only in Convex env vars. `.env.example` (names only) is the one
  committed env file.
- **`prebake:commit` writes data and calls external APIs.** Dry-run
  (`npm run prebake`) first. The 3 default playlists are owner-approved. Don't
  change the curated set unilaterally.
- **Surgical changes:** touch only what the task requires. Match existing style.
  Mention unrelated dead code rather than deleting it.

## Reporting your work

When you finish a change, report three things. The files changed and the
behavior impact. Which validation you ran (`lint` / `typecheck` / `build:web` /
E2E) or why you skipped it. An explicit date for any time-sensitive note (this
repo uses absolute dates).

---

## Running code-quality backlog

Add items here as they come up. Check them off when done. Keep newest context at
the top.

### Deferred (planned for later versions)
- **Rate limiting** on public mutations (`createLobby`/`joinLobby`/`heartbeat`).
  Punted to v1/v2. Integrate with game-mode expansion planning. Use the
  `@convex-dev/rate-limiter` component or HTTP actions (per-`sessionId` alone is
  weak). v0 mitigates resource exhaustion with the hourly cleanup cron only.
- **Light theme.** Tokens are already semantic, so adding light mode is a palette
  sibling swapped via the theme provider, not a refactor (spec §11).

### Known minor items (not blocking)
- Game screen subscribes to both `lobbyState` and `roundView` (each reads
  `players`). Fine at ≤12 players. Revisit only if it shows up in profiling.
- `finalResults` / `playAgain` query submissions per-round in a loop, bounded by
  `TOTAL_ROUNDS` (10), so not a true N+1.

### Done
- Fixed `useGameClock` freeze (countdown/timer pacing). _(audit, 2026-06-13)_
- Extracted `PlaylistCard`, `LoadingScreen`, `errMessage()` for DRY.
- CSPRNG for `sessionId` + lobby codes. Added abandoned-lobby cleanup cron.
