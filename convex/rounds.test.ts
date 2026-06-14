import { describe, expect, it } from "vitest";
import { CHOICE_COUNT, WHEEL_SPAN, YEAR_BAND } from "../lib/constants";
import { buildChoices, buildWheel, TrackLike } from "./rounds";

const pool: TrackLike[] = [
  { title: "Song A", artist: "Artist A", releaseYear: 1985 },
  { title: "Song B", artist: "Artist B", releaseYear: 1990 },
  { title: "Song C", artist: "Artist C", releaseYear: 1995 },
  { title: "Song D", artist: "Artist D", releaseYear: 2000 },
  { title: "Song E", artist: "Artist E", releaseYear: 2005 },
  { title: "Song F", artist: "Artist F", releaseYear: 2010 },
];

describe("buildChoices", () => {
  it("returns five distinct choices with the answer at the stored index", () => {
    const correct = pool[2];
    const { titleChoices, artistChoices, correctTitleIndex, correctArtistIndex } =
      buildChoices(pool, correct);

    expect(titleChoices).toHaveLength(CHOICE_COUNT);
    expect(artistChoices).toHaveLength(CHOICE_COUNT);
    expect(new Set(titleChoices).size).toBe(CHOICE_COUNT);
    expect(titleChoices[correctTitleIndex]).toBe(correct.title);
    expect(artistChoices[correctArtistIndex]).toBe(correct.artist);
  });
});

describe("buildWheel", () => {
  it("spans the fixed window with the band fully inside it", () => {
    for (const year of [1970, 1985, 2003, 2021]) {
      const { wheelMin, wheelMax, band } = buildWheel(year);
      expect(wheelMax - wheelMin).toBe(WHEEL_SPAN);
      expect(band).toBe(YEAR_BAND);
      expect(year - band).toBeGreaterThanOrEqual(wheelMin);
      expect(year + band).toBeLessThanOrEqual(wheelMax);
    }
  });
});
