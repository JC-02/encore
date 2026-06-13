// MusicBrainz original-release-year resolution (spec §9 step 2).
// Recording-level `first-release-date` gives the ORIGINAL year, so a 1985 hit
// on a 2010 compilation reads 1985.
//
// A song maps to MANY MusicBrainz recordings (originals, remasters, live
// takes), all titled identically — and MB search returns slightly different
// result windows per request. Empirically validated combination of signals:
//   - canonical: the exact-match recording with the most attached releases
//   - cluster: the earliest year that >=2 independent recordings agree on
//     (a lone early outlier is usually bad data; two agreeing rarely are)
//   - when those disagree badly, a second query restricted to official
//     non-live/non-compilation releases breaks the tie
// Final answer: the earliest of the trustworthy signals.
//
// ~1 req/sec etiquette: the caller sleeps between lookups; this module sleeps
// itself before its optional second request.

import { cleanTitleForSearch } from "./titles";

const MB_BASE = "https://musicbrainz.org/ws/2/recording";
const MIN_SCORE = 90; // MusicBrainz match score we treat as "confident"
const SUSPICION_GAP_YEARS = 5;
const RATE_DELAY_MS = 1100;
const STUDIO_ONLY =
  " AND status:official AND NOT secondarytype:live AND NOT secondarytype:compilation";

interface MbRecording {
  score: number;
  title: string;
  "first-release-date"?: string;
  "artist-credit"?: { name: string }[];
  releases?: unknown[];
}

/** Loose-but-safe equality: lowercase, strip diacritics + non-alphanumerics. */
function norm(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const esc = (s: string) => s.replace(/(["\\])/g, "\\$1");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Candidate {
  year: number;
  releaseCount: number;
}

async function searchCandidates(
  title: string,
  artist: string,
  userAgent: string,
  extraQuery: string,
): Promise<Candidate[]> {
  const q = `recording:"${esc(cleanTitleForSearch(title))}" AND artist:"${esc(artist)}"${extraQuery}`;
  const url = `${MB_BASE}?query=${encodeURIComponent(q)}&fmt=json&limit=100`;
  const res = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!res.ok) {
    if (res.status === 503) throw new Error("MusicBrainz rate limited (503)");
    return [];
  }
  const body = (await res.json()) as { recordings?: MbRecording[] };

  // Accept either the full title or the search-cleaned one — covers both
  // "(I Can't Help) Falling…" (real parenthetical) and "… (Remaster)" noise.
  const wantTitles = new Set([norm(title), norm(cleanTitleForSearch(title))]);
  const wantArtist = norm(artist);
  const candidates: Candidate[] = [];
  for (const rec of body.recordings ?? []) {
    if (rec.score < MIN_SCORE) continue;
    if (!wantTitles.has(norm(rec.title))) continue;
    const credit = rec["artist-credit"]?.[0]?.name;
    if (!credit || norm(credit) !== wantArtist) continue;
    const date = rec["first-release-date"];
    if (!date) continue;
    const year = parseInt(date.slice(0, 4), 10);
    if (!Number.isFinite(year) || year < 1900 || year > 2100) continue;
    candidates.push({ year, releaseCount: rec.releases?.length ?? 0 });
  }
  return candidates;
}

const canonicalYear = (cands: Candidate[]): number | null =>
  cands.length === 0
    ? null
    : cands.reduce((a, b) => (b.releaseCount > a.releaseCount ? b : a)).year;

/** Earliest year corroborated by >=2 recordings within a 2-year window. */
function clusterYear(cands: Candidate[]): number | null {
  const years = cands.map((c) => c.year).sort((a, b) => a - b);
  for (const y of years) {
    if (years.filter((z) => z >= y && z <= y + 1).length >= 2) return y;
  }
  return null;
}

/** Resolve the original release year for a track, or null when not confident. */
export async function resolveOriginalYear(
  title: string,
  artist: string,
  userAgent: string,
): Promise<number | null> {
  const cands = await searchCandidates(title, artist, userAgent, "");
  if (cands.length === 0) return null;

  const signals = [canonicalYear(cands)!];
  const cluster = clusterYear(cands);
  if (cluster !== null) signals.push(cluster);

  const undecided =
    cluster === null ||
    Math.max(...signals) - Math.min(...signals) > SUSPICION_GAP_YEARS;
  if (undecided) {
    await sleep(RATE_DELAY_MS);
    const filtered = await searchCandidates(title, artist, userAgent, STUDIO_ONLY);
    if (filtered.length > 0) {
      signals.push(clusterYear(filtered) ?? canonicalYear(filtered)!);
    }
  }
  return Math.min(...signals);
}
