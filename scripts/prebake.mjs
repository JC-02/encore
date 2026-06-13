#!/usr/bin/env node
// Convenience wrapper around `convex run prebake:prebake` for the three curated
// v0 default playlists (spec §9). The default sources live here so there's a
// single place to edit them.
//
//   node scripts/prebake.mjs              # dry run on the dev deployment
//   node scripts/prebake.mjs --commit     # write to the dev deployment
//   node scripts/prebake.mjs --commit --prod   # write to production
//
// Via npm:
//   npm run prebake                 (dry run)
//   npm run prebake:commit          (commit to dev)
//   npm run prebake:commit -- --prod   (commit to production)

import { spawnSync } from "node:child_process";

// The approved v0 default playlists (Deezer public playlist IDs).
const DEFAULT_SOURCES = [
  {
    deezerPlaylistId: "9056972262",
    name: "All-Time Hits",
    description: "The biggest songs ever, from every decade.",
    tags: ["default", "mixed"],
  },
  {
    deezerPlaylistId: "8168569082",
    name: "Throwback Party",
    description: "Sing-along smashes from the 80s, 90s and 00s.",
    tags: ["default", "throwback"],
  },
  {
    deezerPlaylistId: "1306931615",
    name: "Rock Essentials",
    description: "Guitar anthems from the 60s to today.",
    tags: ["default", "rock"],
  },
];

const args = process.argv.slice(2);
const commit = args.includes("--commit");
const prod = args.includes("--prod");

const payload = JSON.stringify({ commit, sources: DEFAULT_SOURCES });

console.log(
  `\n🎵 Pre-baking ${DEFAULT_SOURCES.length} default playlists ` +
    `(${commit ? "COMMIT" : "dry run"}, ${prod ? "production" : "dev"})…`,
);
if (!commit) {
  console.log("   No data will be written. Re-run with --commit when satisfied.\n");
}
if (prod) {
  console.log(
    "   ⚠️  Make sure MUSICBRAINZ_USER_AGENT is set on prod:\n" +
      '       npx convex env set MUSICBRAINZ_USER_AGENT "Encore/0.1 (you@example.com)" --prod\n',
  );
}

const convexArgs = ["convex", "run", "prebake:prebake", payload];
if (prod) convexArgs.push("--prod");

const result = spawnSync("npx", convexArgs, { stdio: "inherit" });
process.exit(result.status ?? 1);
