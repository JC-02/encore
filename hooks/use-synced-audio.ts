import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useRef, useState } from "react";

interface SyncedAudioArgs {
  previewUrl: string | null;
  clipStartOffset: number; // seconds into the preview
  playAt: number | null; // server ms
  /** Server-aligned clock from useGameClock. */
  serverNow: () => number;
  /** Stop playback (round revealed / screen left). */
  active: boolean;
}

// If the clip still hasn't loaded this long after playAt, declare failure.
// The round must never block on audio (spec §7 step 6).
const AUDIO_FAIL_GRACE_MS = 4000;

/**
 * Model B synced audio (spec §7): preload paused, seek to clipStartOffset,
 * call play() when the server clock hits playAt.
 */
export function useSyncedAudio({ previewUrl, clipStartOffset, playAt, serverNow, active }: SyncedAudioArgs) {
  const player = useAudioPlayer(previewUrl ? { uri: previewUrl } : null);
  const status = useAudioPlayerStatus(player);
  const [muted, setMuted] = useState(false);
  const [failed, setFailed] = useState(false);
  const startedForRef = useRef<string | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // Schedule the synced start once per round (keyed by previewUrl + playAt).
  useEffect(() => {
    if (!previewUrl || playAt === null || !active) return;
    const key = `${previewUrl}@${playAt}`;
    if (startedForRef.current === key) return;

    const delay = playAt - serverNow();
    const startTimer = setTimeout(() => {
      startedForRef.current = key;
      try {
        player.seekTo(clipStartOffset);
        player.play();
      } catch {
        setFailed(true);
      }
    }, Math.max(0, delay));

    const failTimer = setTimeout(() => {
      if (!player.isLoaded) setFailed(true);
    }, Math.max(0, delay) + AUDIO_FAIL_GRACE_MS);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(failTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl, playAt, active]);

  // Stop when the round leaves the playing phase.
  useEffect(() => {
    if (!active) {
      try {
        player.pause();
      } catch {
        // player may already be released
      }
    }
  }, [active, player]);

  useEffect(() => {
    // expo-audio's player is a mutable handle by design (.muted/.volume/.play()).
    // eslint-disable-next-line react-hooks/immutability
    player.muted = muted;
  }, [muted, player]);

  // Manual retry (banner tap = a user gesture, which un-blocks autoplay).
  // Seeks to where the clip SHOULD be now, so the listener rejoins in sync.
  const retry = () => {
    if (playAt === null) return;
    const elapsed = Math.max(0, (serverNow() - playAt) / 1000);
    try {
      player.seekTo(clipStartOffset + elapsed);
      player.play();
      setFailed(false);
    } catch {
      setFailed(true);
    }
  };

  return {
    isPlaying: status.playing,
    audioFailed: failed && !status.playing,
    muted,
    toggleMute: () => setMuted((m) => !m),
    retry,
  };
}
