// Server-only helpers shared by lobbies.ts and game.ts.

import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { CODE_ALPHABET, CODE_LENGTH, DISCONNECT_GRACE_MS } from "../lib/constants";

export function generateCode(): string {
  // Convex's V8 runtime provides Web Crypto; use it so codes aren't predictable.
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

export async function getLobbyByCode(ctx: QueryCtx, code: string) {
  return await ctx.db
    .query("lobbies")
    .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
    .unique();
}

export async function requireLobbyByCode(ctx: QueryCtx, code: string) {
  const lobby = await getLobbyByCode(ctx, code);
  if (!lobby) throw new Error("Lobby not found");
  return lobby;
}

export function requireHost(lobby: Doc<"lobbies">, sessionId: string) {
  if (lobby.hostSessionId !== sessionId) throw new Error("Host only");
}

export async function getLobbyPlayers(ctx: QueryCtx, lobbyId: Id<"lobbies">) {
  return await ctx.db
    .query("players")
    .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
    .collect();
}

export async function getPlayerBySession(
  ctx: QueryCtx,
  lobbyId: Id<"lobbies">,
  sessionId: string,
) {
  return await ctx.db
    .query("players")
    .withIndex("by_lobby_session", (q) =>
      q.eq("lobbyId", lobbyId).eq("sessionId", sessionId),
    )
    .unique();
}

export function isConnected(player: Doc<"players">, now: number): boolean {
  return now - player.lastSeenAt <= DISCONNECT_GRACE_MS;
}

/** Flip players whose heartbeat went stale to "disconnected" (and back). */
export async function syncConnectionFlags(
  ctx: MutationCtx,
  lobbyId: Id<"lobbies">,
  now: number,
) {
  const players = await getLobbyPlayers(ctx, lobbyId);
  for (const p of players) {
    const fresh = isConnected(p, now) ? "connected" : "disconnected";
    if (p.connection !== fresh) await ctx.db.patch(p._id, { connection: fresh });
  }
}
