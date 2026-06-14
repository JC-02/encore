// Game constants. The single config module (spec §7).
// Imported by both the Expo client and the Convex backend.

export const COUNTDOWN_LOBBY_MS = 15_000;
export const SYNC_BUFFER_MS = 3_500;
export const ANSWER_WINDOW_MS = 27_000;
export const REVEAL_PAUSE_MS = 5_000;
export const TOTAL_ROUNDS = 10;
export const MAX_PLAYERS = 12;

// Year wheel (v0: every playlist spans >= 25 years, so the window is fixed)
export const WHEEL_SPAN = 25; // wheelMax - wheelMin
export const YEAR_BAND = 2; // ±band for partial credit
// True year sits at a random index in [WHEEL_ANSWER_MIN_INDEX, WHEEL_ANSWER_MAX_INDEX]
// so the band fits fully on the wheel and the answer is never at an edge (R5).
export const WHEEL_ANSWER_MIN_INDEX = 3;
export const WHEEL_ANSWER_MAX_INDEX = 22;

// Scoring
export const POINTS_TITLE = 1;
export const POINTS_ARTIST = 2;
export const POINTS_YEAR_EXACT = 3;
export const POINTS_YEAR_BAND = 1;

// Multiple choice
export const CHOICE_COUNT = 5; // 1 correct + 4 decoys

// Presence
export const HEARTBEAT_INTERVAL_MS = 10_000;
export const DISCONNECT_GRACE_MS = 30_000;

// Lobby codes: 4 chars, ambiguous characters removed (no O/0/I/1)
export const CODE_LENGTH = 4;
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Preset avatars (rendered by the Avatar primitive from these ids)
export const AVATAR_IDS = [
  "vinyl",
  "mic",
  "headphones",
  "guitar",
  "drums",
  "keys",
  "sax",
  "trumpet",
] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];
