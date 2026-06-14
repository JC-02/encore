// Track-title cleanup shared by the prebake pipeline and the MusicBrainz
// resolver. Two different jobs:
//   - cleanDisplayTitle: what players SEE. Strip release noise like
//     "(Remastered 2009)" (ugly, and "2015 Remaster" leaks era hints) while
//     preserving real parentheticals ("(I Can't Help) Falling in Love…").
//   - cleanTitleForSearch: what we SEND to MusicBrainz. Strip everything
//     bracketed plus feat. credits, maximizing match odds.

const NOISE =
  /remaster|digital master|radio edit|single version|album version|\bmono\b|\bstereo\b|\blive\b|deluxe|anniversary|re-?recorded|bonus track|\bedit\b/i;

export function cleanDisplayTitle(title: string): string {
  return title
    // bracketed chunks that are pure release noise
    .replace(/\s*[([]([^)\]]*)[)\]]/g, (match, inner: string) =>
      NOISE.test(inner) ? "" : match,
    )
    // trailing "- 2011 Remaster" style suffixes
    .replace(
      /\s*-\s*[^-]*?(remaster|digital master|radio edit|single version|album version|mono|stereo|live|re-?recorded)[^-]*$/i,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function cleanTitleForSearch(title: string): string {
  return title
    .replace(/\s*[([].*?[)\]]/g, "")
    .replace(/\s*-\s*(remaster(ed)?|radio edit|single version|live|mono|stereo).*/i, "")
    .replace(/\s*(feat\.?|ft\.?)\s.*/i, "")
    .trim();
}
