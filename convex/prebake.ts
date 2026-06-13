// One-time/admin pre-bake of the default playlists (spec §9).
// Run with commit:false to produce the owner-approval report (stats + sample
// years), then commit:true to write to Convex. Never used during live games.
//
//   npx convex run prebake:prebake '{"sources":[...], "commit": false}'

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { deezerProvider } from "./music/deezer";
import { resolveOriginalYear } from "./music/musicbrainz";
import { ProviderTrack } from "./music/provider";
import { cleanDisplayTitle } from "./music/titles";

const MB_DELAY_MS = 1100; // MusicBrainz ~1 req/sec etiquette

// §9 validity rules for a default playlist
const MIN_TRACKS = 40;
const MIN_ARTISTS = 15;
const MIN_YEARS = 8;
const MIN_SPAN = 25;
const MAX_ARTIST_SHARE = 0.2;
const MAX_YEAR_SHARE = 0.25;

const sourceArg = v.object({
  deezerPlaylistId: v.string(),
  name: v.string(),
  description: v.string(),
  tags: v.array(v.string()),
});

type ResolvedTrack = ProviderTrack & { releaseYear: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cacheKey = (t: ProviderTrack) =>
  `${t.artist.toLowerCase()}|${t.title.toLowerCase()}`;

export const prebake = action({
  args: { sources: v.array(sourceArg), commit: v.boolean() },
  handler: async (ctx, { sources, commit }) => {
    const userAgent =
      process.env.MUSICBRAINZ_USER_AGENT ?? "Encore/0.1 (dev build, no contact set)";
    const reports = [];

    for (const source of sources) {
      const fetched = await deezerProvider.fetchPlaylistTracks(
        source.deezerPlaylistId,
      );
      // Players see cleaned titles ("Hey Jude", not "Hey Jude (Remastered 2015)").
      const cleaned = fetched.map((t) => ({ ...t, title: cleanDisplayTitle(t.title) }));
      // Dedupe (repeats + remaster/original twins collapse once cleaned) +
      // require a preview.
      const seen = new Set<string>();
      const withPreview = cleaned.filter((t) => {
        const key = cacheKey(t);
        if (!t.previewUrl || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Resolve original years, cache-first.
      const cachedPairs = await ctx.runQuery(internal.prebake.getCachedYears, {
        keys: withPreview.map(cacheKey),
      });
      const cached = new Map(cachedPairs.map((p) => [p.key, p.year]));
      const resolved: ResolvedTrack[] = [];
      let mbLookups = 0;
      let lookupErrors = 0;
      for (const t of withPreview) {
        const key = cacheKey(t);
        let year = cached.get(key);
        if (year === undefined) {
          if (mbLookups > 0) await sleep(MB_DELAY_MS);
          mbLookups++;
          try {
            year = await resolveOriginalYear(t.title, t.artist, userAgent);
          } catch {
            // Transient MB failure: skip WITHOUT caching so a re-run retries it.
            // (Progress so far is cached, so re-running after a timeout resumes.)
            lookupErrors++;
            continue;
          }
          await ctx.runMutation(internal.prebake.putCachedYear, { key, year });
        }
        if (year !== null) resolved.push({ ...t, releaseYear: year });
      }

      const stats = computeStats(resolved);
      const report = {
        source,
        fetchedCount: fetched.length,
        withPreviewCount: withPreview.length,
        lookupErrors,
        ...stats,
        sampleYears: sampleForSpotCheck(resolved),
        committed: false,
      };

      if (commit) {
        if (lookupErrors > 0) {
          throw new Error(
            `"${source.name}": ${lookupErrors} year lookups failed — re-run (cache resumes) before committing`,
          );
        }
        if (!stats.valid) {
          throw new Error(
            `"${source.name}" fails §9 validity: ${stats.failures.join("; ")}`,
          );
        }
        await ctx.runMutation(internal.prebake.replacePlaylist, {
          playlist: {
            name: source.name,
            description: source.description,
            tags: source.tags,
            trackCount: resolved.length,
            minYear: stats.minYear,
            maxYear: stats.maxYear,
            isDefault: true,
          },
          tracks: resolved.map((t) => ({
            deezerId: t.externalId,
            title: t.title,
            artist: t.artist,
            albumCoverUrl: t.albumCoverUrl,
            previewUrl: t.previewUrl,
            releaseYear: t.releaseYear,
            explicit: t.explicit,
          })),
        });
        report.committed = true;
      }
      reports.push(report);
    }
    return reports;
  },
});

function computeStats(tracks: ResolvedTrack[]) {
  const years = tracks.map((t) => t.releaseYear);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const counts = <K extends string | number>(keys: K[]) => {
    const m = new Map<K, number>();
    for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };
  const byArtist = counts(tracks.map((t) => t.artist.toLowerCase()));
  const byYear = counts(years);
  const maxArtistShare = Math.max(0, ...byArtist.values()) / Math.max(1, tracks.length);
  const maxYearShare = Math.max(0, ...byYear.values()) / Math.max(1, tracks.length);

  const failures: string[] = [];
  if (tracks.length < MIN_TRACKS) failures.push(`only ${tracks.length} valid tracks (need ${MIN_TRACKS})`);
  if (byArtist.size < MIN_ARTISTS) failures.push(`only ${byArtist.size} artists (need ${MIN_ARTISTS})`);
  if (byYear.size < MIN_YEARS) failures.push(`only ${byYear.size} distinct years (need ${MIN_YEARS})`);
  if (maxYear - minYear < MIN_SPAN) failures.push(`span ${maxYear - minYear}yr (need ${MIN_SPAN})`);
  if (maxArtistShare > MAX_ARTIST_SHARE) failures.push(`one artist is ${Math.round(maxArtistShare * 100)}% of tracks (max 20%)`);
  if (maxYearShare > MAX_YEAR_SHARE) failures.push(`one year is ${Math.round(maxYearShare * 100)}% of tracks (max 25%)`);

  return {
    validTrackCount: tracks.length,
    distinctArtists: byArtist.size,
    distinctYears: byYear.size,
    minYear,
    maxYear,
    span: maxYear - minYear,
    maxArtistSharePct: Math.round(maxArtistShare * 100),
    maxYearSharePct: Math.round(maxYearShare * 100),
    valid: failures.length === 0,
    failures,
  };
}

/** ~12 evenly spread tracks for the owner's year spot-check. */
function sampleForSpotCheck(tracks: ResolvedTrack[]) {
  const sorted = [...tracks].sort((a, b) => a.releaseYear - b.releaseYear);
  const step = Math.max(1, Math.floor(sorted.length / 12));
  return sorted
    .filter((_, i) => i % step === 0)
    .slice(0, 12)
    .map((t) => ({ title: t.title, artist: t.artist, year: t.releaseYear }));
}

// ---------- internal db plumbing for the action ----------

// Returns pairs (not a Record): Convex field names must be ASCII, cache keys
// aren't ("beyoncé|…").
export const getCachedYears = internalQuery({
  args: { keys: v.array(v.string()) },
  handler: async (ctx, { keys }) => {
    const out: { key: string; year: number | null }[] = [];
    for (const key of keys) {
      const hit = await ctx.db
        .query("mbYearCache")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (hit) out.push({ key, year: hit.year });
    }
    return out;
  },
});

/** Admin: wipe the year cache (after improving the resolver heuristic). */
export const clearYearCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("mbYearCache").collect();
    for (const row of rows) await ctx.db.delete(row._id);
    return rows.length;
  },
});

export const putCachedYear = internalMutation({
  args: { key: v.string(), year: v.union(v.number(), v.null()) },
  handler: async (ctx, { key, year }) => {
    const hit = await ctx.db
      .query("mbYearCache")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (hit) await ctx.db.patch(hit._id, { year });
    else await ctx.db.insert("mbYearCache", { key, year });
  },
});

const bakedTrackArg = v.object({
  deezerId: v.number(),
  title: v.string(),
  artist: v.string(),
  albumCoverUrl: v.string(),
  previewUrl: v.string(),
  releaseYear: v.number(),
  explicit: v.boolean(),
});

export const replacePlaylist = internalMutation({
  args: {
    playlist: v.object({
      name: v.string(),
      description: v.string(),
      tags: v.array(v.string()),
      trackCount: v.number(),
      minYear: v.number(),
      maxYear: v.number(),
      isDefault: v.boolean(),
    }),
    tracks: v.array(bakedTrackArg),
  },
  handler: async (ctx, { playlist, tracks }) => {
    // Idempotent by name: re-baking replaces the old copy.
    const existing = (await ctx.db.query("playlists").collect()).find(
      (p) => p.name === playlist.name,
    );
    if (existing) {
      const oldTracks = await ctx.db
        .query("tracks")
        .withIndex("by_playlist", (q) => q.eq("playlistId", existing._id))
        .collect();
      for (const t of oldTracks) await ctx.db.delete(t._id);
      await ctx.db.delete(existing._id);
    }
    const playlistId = await ctx.db.insert("playlists", playlist);
    for (const t of tracks) await ctx.db.insert("tracks", { ...t, playlistId });
    return playlistId;
  },
});
