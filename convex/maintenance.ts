// Scheduled cleanup of stale lobbies and their child docs.
//
// Lobbies are created freely by unauthenticated clients (anonymous party game),
// so without cleanup the tables grow without bound — the main resource-
// exhaustion vector. A real game lasts ~10 minutes, so anything older than the
// cutoff is abandoned and safe to delete regardless of status.

import { internalMutation, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const STALE_AFTER_MS = 24 * 60 * 60 * 1000; // 24h — far beyond any real game
const MAX_DELETIONS_PER_RUN = 100; // bound the work per cron tick

async function deleteLobbyCascade(ctx: MutationCtx, lobbyId: Id<"lobbies">) {
  const rounds = await ctx.db
    .query("rounds")
    .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
    .collect();
  for (const round of rounds) {
    const secrets = await ctx.db
      .query("roundSecrets")
      .withIndex("by_round", (q) => q.eq("roundId", round._id))
      .collect();
    for (const s of secrets) await ctx.db.delete(s._id);
    const subs = await ctx.db
      .query("submissions")
      .withIndex("by_round", (q) => q.eq("roundId", round._id))
      .collect();
    for (const s of subs) await ctx.db.delete(s._id);
    await ctx.db.delete(round._id);
  }
  const players = await ctx.db
    .query("players")
    .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
    .collect();
  for (const p of players) await ctx.db.delete(p._id);
  await ctx.db.delete(lobbyId);
}

export const cleanupStaleLobbies = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_AFTER_MS;
    const stale = await ctx.db
      .query("lobbies")
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .take(MAX_DELETIONS_PER_RUN);
    for (const lobby of stale) await deleteLobbyCascade(ctx, lobby._id);
    return { deleted: stale.length };
  },
});
