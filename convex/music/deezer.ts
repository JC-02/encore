// Deezer implementation of MusicProvider. Public read endpoints, no API key.
// Called server-side from Convex actions only (sidesteps browser CORS).

import { MusicProvider, ProviderTrack } from "./provider";

interface DeezerTrack {
  id: number;
  title: string;
  preview: string;
  explicit_lyrics: boolean;
  artist: { name: string };
  album: { cover_medium: string };
}

interface DeezerPage {
  data: DeezerTrack[];
  total: number;
  next?: string;
}

const PAGE_SIZE = 100;
const MAX_TRACKS = 200; // safety cap; curated sources are ~40-120 tracks

export const deezerProvider: MusicProvider = {
  name: "deezer",

  async fetchPlaylistTracks(sourcePlaylistId: string): Promise<ProviderTrack[]> {
    const tracks: ProviderTrack[] = [];
    let index = 0;
    for (;;) {
      const res = await fetch(
        `https://api.deezer.com/playlist/${sourcePlaylistId}/tracks?limit=${PAGE_SIZE}&index=${index}`,
      );
      if (!res.ok) throw new Error(`Deezer ${res.status} for playlist ${sourcePlaylistId}`);
      const page = (await res.json()) as DeezerPage & { error?: { message: string } };
      if (page.error) throw new Error(`Deezer error: ${page.error.message}`);

      for (const t of page.data) {
        tracks.push({
          externalId: t.id,
          title: t.title,
          artist: t.artist.name,
          albumCoverUrl: t.album.cover_medium,
          previewUrl: t.preview,
          explicit: t.explicit_lyrics,
        });
      }
      index += page.data.length;
      if (!page.next || page.data.length === 0 || index >= MAX_TRACKS) break;
    }
    return tracks;
  },
};
