// Round building: decoy selection + year-wheel placement (spec §8).
// Pure functions — no Convex context — so the logic is testable and DRY.

import {
  CHOICE_COUNT,
  WHEEL_ANSWER_MAX_INDEX,
  WHEEL_ANSWER_MIN_INDEX,
  WHEEL_SPAN,
  YEAR_BAND,
} from "../lib/constants";

export interface TrackLike {
  title: string;
  artist: string;
  releaseYear: number;
}

function randInt(min: number, max: number): number {
  // inclusive bounds
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Pick 4 decoy values for one field (title or artist) from the same playlist.
 * Prefers tracks whose releaseYear is near the correct year (so the year
 * can't be deduced by elimination); falls back to any distinct entries.
 */
function pickDecoys(
  pool: TrackLike[],
  correct: TrackLike,
  field: "title" | "artist",
): string[] {
  const needed = CHOICE_COUNT - 1;
  const taken = new Set<string>([norm(correct[field])]);

  // Nearest-year first; shuffle within so equal distances vary between games.
  const byYearDistance = shuffle(pool).sort(
    (a, b) =>
      Math.abs(a.releaseYear - correct.releaseYear) -
      Math.abs(b.releaseYear - correct.releaseYear),
  );

  // Prefer the closest ~quarter of the playlist, then widen to everything.
  const nearCount = Math.max(needed * 3, Math.floor(byYearDistance.length / 4));
  const tiers = [byYearDistance.slice(0, nearCount), byYearDistance];

  const decoys: string[] = [];
  for (const tier of tiers) {
    for (const t of shuffle(tier)) {
      if (decoys.length === needed) break;
      const value = t[field];
      if (taken.has(norm(value))) continue;
      taken.add(norm(value));
      decoys.push(value);
    }
    if (decoys.length === needed) break;
  }
  return decoys;
}

export interface BuiltChoices {
  titleChoices: string[];
  artistChoices: string[];
  correctTitleIndex: number;
  correctArtistIndex: number;
}

/** Build the two shuffled 5-option lists; correct indices go to roundSecrets only. */
export function buildChoices(pool: TrackLike[], correct: TrackLike): BuiltChoices {
  const titleChoices = shuffle([
    correct.title,
    ...pickDecoys(pool, correct, "title"),
  ]);
  const artistChoices = shuffle([
    correct.artist,
    ...pickDecoys(pool, correct, "artist"),
  ]);
  return {
    titleChoices,
    artistChoices,
    correctTitleIndex: titleChoices.indexOf(correct.title),
    correctArtistIndex: artistChoices.indexOf(correct.artist),
  };
}

export interface WheelWindow {
  wheelMin: number;
  wheelMax: number;
  band: number;
}

/**
 * Place the 25-year wheel window so the true year sits at a random index
 * between 3 and 22 — band fully on the wheel, answer never at an edge (R5).
 */
export function buildWheel(trueYear: number): WheelWindow {
  const wheelMin = trueYear - randInt(WHEEL_ANSWER_MIN_INDEX, WHEEL_ANSWER_MAX_INDEX);
  return { wheelMin, wheelMax: wheelMin + WHEEL_SPAN, band: YEAR_BAND };
}

/**
 * Seconds into the 30s preview to begin. The answer window is 27s, so an
 * offset of 0–3s always leaves a full clip's worth of audio.
 */
export function pickClipStartOffset(): number {
  return randInt(0, 3);
}
