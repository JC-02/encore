// Display-name validation (spec §10).
// Runs on BOTH client (instant feedback) and server (authority).

export const NAME_MIN = 3;
export const NAME_MAX = 16;
const NAME_ALLOWED = /^[A-Za-z0-9 _-]+$/;

// Small blocklist of slurs/profanity, matched after leetspeak normalization.
// Kept lowercase; matched as substrings of the normalized name.
const BLOCKLIST = [
  "fuck",
  "shit",
  "cunt",
  "bitch",
  "asshole",
  "dick",
  "pussy",
  "nigga",
  "nigger",
  "faggot",
  "retard",
  "kike",
  "spic",
  "chink",
  "tranny",
  "whore",
  "slut",
  "rape",
  "nazi",
  "hitler",
];

const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  $: "s",
  "!": "i",
};

function normalizeLeet(s: string): string {
  return s
    .toLowerCase()
    .split("")
    .map((c) => LEET_MAP[c] ?? c)
    .join("")
    .replace(/[^a-z]/g, "");
}

/** Trim + collapse repeated whitespace. Apply before validating and storing. */
export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Returns null if valid, otherwise a human-readable error message. */
export function validateName(raw: string): string | null {
  const name = cleanName(raw);
  if (name.length < NAME_MIN) return `Name must be at least ${NAME_MIN} characters`;
  if (name.length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters`;
  if (!NAME_ALLOWED.test(name))
    return "Only letters, numbers, spaces, _ and - are allowed";
  const normalized = normalizeLeet(name);
  if (BLOCKLIST.some((w) => normalized.includes(w))) return "Pick a different name";
  return null;
}
