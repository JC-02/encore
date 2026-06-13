// Anonymous identity: a client-generated session id persisted locally
// (spec §4 players.sessionId). No accounts in v0.

import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "encore.sessionId";
const PROFILE_KEY = "encore.profile";

// The session id is the player's only identity/auth token, so prefer a CSPRNG.
// `crypto.getRandomValues` exists on web (the v0 deploy target) and on native
// when a polyfill is present; fall back to Math.random otherwise so the app
// still runs (with weaker entropy) on an un-polyfilled native runtime.
function randomId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const len = 24;
  const webCrypto = (globalThis as { crypto?: Crypto }).crypto;
  let bytes: Uint8Array;
  if (webCrypto?.getRandomValues) {
    bytes = webCrypto.getRandomValues(new Uint8Array(len));
  } else {
    bytes = Uint8Array.from({ length: len }, () => Math.floor(Math.random() * 256));
  }
  let id = "";
  for (let i = 0; i < len; i++) id += alphabet[bytes[i] % alphabet.length];
  return `${id}${Date.now().toString(36)}`;
}

let cached: string | null = null;

export async function getSessionId(): Promise<string> {
  if (cached) return cached;
  const stored = await AsyncStorage.getItem(SESSION_KEY);
  if (stored) {
    cached = stored;
    return stored;
  }
  const fresh = randomId();
  await AsyncStorage.setItem(SESSION_KEY, fresh);
  cached = fresh;
  return fresh;
}

export interface StoredProfile {
  name: string;
  avatarId: string;
}

/** Remember the last-used name/avatar to prefill the setup forms. */
export async function loadProfile(): Promise<StoredProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as StoredProfile) : null;
}

export async function saveProfile(profile: StoredProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
