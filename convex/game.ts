import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, MutationCtx, query } from "./_generated/server";
import {
  getLobbyByCode,
  getLobbyPlayers,
  getPlayerBySession,
  isConnected,
  requireHost,
  requireLobbyByCode,
} from "./helpers";
import { buildChoices, buildWheel, pickClipStartOffset, shuffle } from "./rounds";
import {
  ANSWER_WINDOW_MS,
  CHOICE_COUNT,
  POINTS_ARTIST,
  POINTS_TITLE,
  POINTS_YEAR_BAND,
  POINTS_YEAR_EXACT,
  REVEAL_PAUSE_MS,
  SYNC_BUFFER_MS,
} from "../lib/constants";

// ---------- Round lifecycle (internal, scheduled) ----------

export const beginGame = internalMutation({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, { lobbyId }) => {
    const lobby = await ctx.db.get(lobbyId);
    // No-op if the countdown was cancelled between scheduling and firing.
    if (!lobby || lobby.status !== "countdown") return;
    await ctx.db.patch(lobbyId, {
      status: "in_game",
      countdownEndsAt: undefined,
      scheduledBeginId: undefined,
    });
    await startRoundForLobby(ctx, lobbyId, 1);
  },
});

export const startRound = internalMutation({
  args: { lobbyId: v.id("lobbies"), roundNumber: v.number() },
  handler: async (ctx, { lobbyId, roundNumber }) => {
    await startRoundForLobby(ctx, lobbyId, roundNumber);
  },
});

async function startRoundForLobby(
  ctx: MutationCtx,
  lobbyId: Id<"lobbies">,
  roundNumber: number,
) {
  const lobby = await ctx.db.get(lobbyId);
  if (!lobby || lobby.status !== "in_game") return;

  const allTracks = await ctx.db
    .query("tracks")
    .withIndex("by_playlist", (q) => q.eq("playlistId", lobby.playlistId))
    .collect();
  const used = new Set(lobby.usedTrackIds);
  const unused = allTracks.filter((t) => !used.has(t._id));
  if (unused.length === 0) throw new Error("Playlist ran out of tracks");

  const track = shuffle(unused)[0];
  const choices = buildChoices(allTracks, track);
  const wheel = buildWheel(track.releaseYear);

  const now = Date.now();
  const playAt = now + SYNC_BUFFER_MS;
  const endsAt = playAt + ANSWER_WINDOW_MS;

  const roundId = await ctx.db.insert("rounds", {
    lobbyId,
    roundNumber,
    trackId: track._id,
    titleChoices: choices.titleChoices,
    artistChoices: choices.artistChoices,
    wheelMin: wheel.wheelMin,
    wheelMax: wheel.wheelMax,
    band: wheel.band,
    clipStartOffset: pickClipStartOffset(),
    playAt,
    endsAt,
    status: "playing",
  });
  await ctx.db.insert("roundSecrets", {
    roundId,
    correctTitleIndex: choices.correctTitleIndex,
    correctArtistIndex: choices.correctArtistIndex,
    correctYear: track.releaseYear,
  });
  await ctx.db.patch(lobbyId, {
    currentRound: roundNumber,
    usedTrackIds: [...lobby.usedTrackIds, track._id],
  });
  await ctx.scheduler.runAt(endsAt, internal.game.endRound, { roundId });
}

export const endRound = internalMutation({
  args: { roundId: v.id("rounds") },
  handler: async (ctx, { roundId }) => {
    await finishRound(ctx, roundId);
  },
});

/** Flip a round to revealed; idempotent (timer vs. all-submitted race). */
async function finishRound(ctx: MutationCtx, roundId: Id<"rounds">) {
  const round = await ctx.db.get(roundId);
  if (!round || round.status !== "playing") return;
  const track = await ctx.db.get(round.trackId);
  if (!track) return;

  await ctx.db.patch(roundId, {
    status: "revealed",
    revealTitle: track.title,
    revealArtist: track.artist,
    revealYear: track.releaseYear,
    revealCoverUrl: track.albumCoverUrl,
  });
  await ctx.scheduler.runAfter(REVEAL_PAUSE_MS, internal.game.advance, {
    lobbyId: round.lobbyId,
    finishedRoundNumber: round.roundNumber,
  });
}

export const advance = internalMutation({
  args: { lobbyId: v.id("lobbies"), finishedRoundNumber: v.number() },
  handler: async (ctx, { lobbyId, finishedRoundNumber }) => {
    const lobby = await ctx.db.get(lobbyId);
    if (!lobby || lobby.status !== "in_game") return;
    // Stale job from a previous round (defensive; shouldn't happen).
    if (lobby.currentRound !== finishedRoundNumber) return;

    if (finishedRoundNumber >= lobby.totalRounds) {
      await ctx.db.patch(lobbyId, { status: "finished" });
    } else {
      await startRoundForLobby(ctx, lobbyId, finishedRoundNumber + 1);
    }
  },
});

// ---------- Player-facing ----------

export const submitAnswer = mutation({
  args: {
    roundId: v.id("rounds"),
    sessionId: v.string(),
    answer: v.object({
      titleIndex: v.number(),
      artistIndex: v.number(),
      yearGuess: v.number(),
    }),
  },
  handler: async (ctx, { roundId, sessionId, answer }) => {
    const now = Date.now();
    const round = await ctx.db.get(roundId);
    if (!round || round.status !== "playing" || now > round.endsAt) {
      throw new Error("Round is over");
    }
    const player = await getPlayerBySession(ctx, round.lobbyId, sessionId);
    if (!player) throw new Error("Not in this game");

    const { titleIndex, artistIndex, yearGuess } = answer;
    if (
      !Number.isInteger(titleIndex) || titleIndex < 0 || titleIndex >= CHOICE_COUNT ||
      !Number.isInteger(artistIndex) || artistIndex < 0 || artistIndex >= CHOICE_COUNT ||
      !Number.isInteger(yearGuess) || yearGuess < round.wheelMin || yearGuess > round.wheelMax
    ) {
      throw new Error("Invalid answer");
    }

    const existing = await ctx.db
      .query("submissions")
      .withIndex("by_round_player", (q) =>
        q.eq("roundId", roundId).eq("playerId", player._id),
      )
      .unique();
    if (existing) throw new Error("Already submitted");

    const secret = await ctx.db
      .query("roundSecrets")
      .withIndex("by_round", (q) => q.eq("roundId", roundId))
      .unique();
    if (!secret) throw new Error("Round misconfigured");

    const titleCorrect = titleIndex === secret.correctTitleIndex;
    const artistCorrect = artistIndex === secret.correctArtistIndex;
    const yearDiff = Math.abs(yearGuess - secret.correctYear);
    const yearPoints =
      yearDiff === 0 ? POINTS_YEAR_EXACT : yearDiff <= round.band ? POINTS_YEAR_BAND : 0;
    const roundPoints =
      (titleCorrect ? POINTS_TITLE : 0) +
      (artistCorrect ? POINTS_ARTIST : 0) +
      yearPoints;

    await ctx.db.insert("submissions", {
      roundId,
      playerId: player._id,
      titleIndex,
      artistIndex,
      yearGuess,
      submittedAt: now,
      titleCorrect,
      artistCorrect,
      yearPoints,
      roundPoints,
    });
    await ctx.db.patch(player._id, {
      totalScore: player.totalScore + roundPoints,
      connection: "connected",
      lastSeenAt: now,
    });

    // End early once every connected player has submitted.
    const players = await getLobbyPlayers(ctx, round.lobbyId);
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_round", (q) => q.eq("roundId", roundId))
      .collect();
    const submittedIds = new Set(submissions.map((s) => s.playerId));
    const waitingOnSomeone = players.some(
      (p) => isConnected(p, now) && !submittedIds.has(p._id),
    );
    if (!waitingOnSomeone) await finishRound(ctx, roundId);
  },
});

/**
 * The current round as a client may see it (rule R6):
 * - while "playing": choices, wheel, timing, your own picks — never correctness
 * - once "revealed": reveal fields, your scored submission, scoreboard
 */
export const roundView = query({
  args: { code: v.string(), sessionId: v.string() },
  handler: async (ctx, { code, sessionId }) => {
    const lobby = await getLobbyByCode(ctx, code);
    if (!lobby || lobby.currentRound === 0) return null;
    const round = await ctx.db
      .query("rounds")
      .withIndex("by_lobby_round", (q) =>
        q.eq("lobbyId", lobby._id).eq("roundNumber", lobby.currentRound),
      )
      .unique();
    if (!round) return null;

    const track = await ctx.db.get(round.trackId);
    const players = await getLobbyPlayers(ctx, lobby._id);
    const you = players.find((p) => p.sessionId === sessionId) ?? null;

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_round", (q) => q.eq("roundId", round._id))
      .collect();
    const yours = you ? submissions.find((s) => s.playerId === you._id) : undefined;

    const revealed = round.status === "revealed";
    const now = Date.now();

    return {
      serverNow: now,
      roundId: round._id,
      roundNumber: round.roundNumber,
      totalRounds: lobby.totalRounds,
      status: round.status,
      playAt: round.playAt,
      endsAt: round.endsAt,
      clipStartOffset: round.clipStartOffset,
      previewUrl: track?.previewUrl ?? null,
      titleChoices: round.titleChoices,
      artistChoices: round.artistChoices,
      wheelMin: round.wheelMin,
      wheelMax: round.wheelMax,
      band: round.band,
      submittedCount: submissions.length,
      connectedCount: players.filter((p) => isConnected(p, now)).length,
      yourSubmission: yours
        ? {
            titleIndex: yours.titleIndex,
            artistIndex: yours.artistIndex,
            yearGuess: yours.yearGuess,
            // Correctness/points are secret until reveal (R6).
            ...(revealed
              ? {
                  titleCorrect: yours.titleCorrect,
                  artistCorrect: yours.artistCorrect,
                  yearPoints: yours.yearPoints,
                  roundPoints: yours.roundPoints,
                }
              : {}),
          }
        : null,
      reveal: revealed
        ? {
            title: round.revealTitle!,
            artist: round.revealArtist!,
            year: round.revealYear!,
            coverUrl: round.revealCoverUrl!,
            scoreboard: buildScoreboard(players, you?._id ?? null),
          }
        : null,
    };
  },
});

/** Top-3-plus-self scoreboard rows (spec §13.6). */
function buildScoreboard(players: Doc<"players">[], youId: Id<"players"> | null) {
  const ranked = [...players].sort((a, b) => b.totalScore - a.totalScore);
  const rows = ranked.map((p, i) => ({
    rank: i + 1,
    playerId: p._id,
    name: p.name,
    avatarId: p.avatarId,
    totalScore: p.totalScore,
    isYou: p._id === youId,
  }));
  const top = rows.slice(0, 3);
  const self = rows.find((r) => r.isYou);
  if (self && !top.some((r) => r.isYou)) top.push(self);
  return top;
}

export const finalResults = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const lobby = await getLobbyByCode(ctx, code);
    if (!lobby || lobby.status !== "finished") return null;

    const players = await getLobbyPlayers(ctx, lobby._id);
    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobby._id))
      .collect();

    // Tiebreak: higher total → fewer total submit-ms → deterministic flip.
    const submitMs = new Map<Id<"players">, number>();
    for (const round of rounds) {
      const subs = await ctx.db
        .query("submissions")
        .withIndex("by_round", (q) => q.eq("roundId", round._id))
        .collect();
      for (const s of subs) {
        submitMs.set(
          s.playerId,
          (submitMs.get(s.playerId) ?? 0) + (s.submittedAt - round.playAt),
        );
      }
    }
    const ranked = [...players].sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      const aMs = submitMs.get(a._id) ?? Infinity;
      const bMs = submitMs.get(b._id) ?? Infinity;
      if (aMs !== bMs) return aMs - bMs;
      return a._id < b._id ? -1 : 1; // the "coin flip", made stable
    });
    return ranked.map((p, i) => ({
      rank: i + 1,
      playerId: p._id,
      name: p.name,
      avatarId: p.avatarId,
      totalScore: p.totalScore,
    }));
  },
});

/** Host-only: reset the same lobby + players for a fresh game (spec §13.7). */
export const playAgain = mutation({
  args: { code: v.string(), sessionId: v.string() },
  handler: async (ctx, { code, sessionId }) => {
    const lobby = await requireLobbyByCode(ctx, code);
    requireHost(lobby, sessionId);
    if (lobby.status !== "finished") throw new Error("Game not finished");

    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobby._id))
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
    const players = await getLobbyPlayers(ctx, lobby._id);
    for (const p of players) await ctx.db.patch(p._id, { totalScore: 0 });
    await ctx.db.patch(lobby._id, {
      status: "waiting",
      currentRound: 0,
      usedTrackIds: [],
      countdownEndsAt: undefined,
      scheduledBeginId: undefined,
    });
  },
});
