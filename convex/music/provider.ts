// MusicProvider — the deliberate v1 swap seam (spec §3).
// v0 ships exactly one implementation (Deezer). Game code never talks to a
// provider at runtime; providers are used only at pre-bake time.

export interface ProviderTrack {
  externalId: number;
  title: string;
  artist: string;
  albumCoverUrl: string;
  previewUrl: string; // ~30s MP3, playable directly
  explicit: boolean;
}

export interface MusicProvider {
  name: string;
  /** Fetch all tracks of a provider-hosted public playlist. */
  fetchPlaylistTracks(sourcePlaylistId: string): Promise<ProviderTrack[]>;
}
