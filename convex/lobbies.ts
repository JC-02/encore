import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import {
  generateCode,
  getLobbyByCode,
  getLobbyPlayers,
  getPlayerBySession,
  requireHost,
  requireLobbyByCode,
  syncConnectionFlags,
} from "./helpers";
import {
  AVATAR_IDS,
  COUNTDOWN_LOBBY_MS,
  MAX_PLAYERS,
  TOTAL_ROUNDS,
} from "../lib/constants";
import { cleanName, validateName } from "../lib/validation";

const playerArg = v.object({
  name: v.string(),
  avatarId: v.string(),
  sessionId: v.string(),
});

/** Server-side authority for name + avatar (client validates too, for UX). */
function validatePlayerInput(input: { name: string; avatarId: string }) {
  const error = validateName(input.name);
  if (error) throw new Error(error);
  if (!(AVATAR_IDS as readonly string[]).includes(input.avatarId)) {
    throw new Error("Invalid avatar");
  }
  return cleanName(input.name);
}

export const defaultPlaylists = query({
  args: {},
  handler: async (ctx) => {
    const playlists = await ctx.db.query("playlists").collect();
    return playlists
      .filter((p) => p.isDefault)
      .map(({ _id, name, description, trackCount, minYear, maxYear, tags }) => ({
        _id,
        name,
        description,
        trackCount,
        minYear,
        maxYear,
        tags,
      }));
  },
});

export const createLobby = mutation({
  args: { playlistId: v.id("playlists"), host: playerArg },
  handler: async (ctx, { playlistId, host }) => {
    const name = validatePlayerInput(host);
    const playlist = await ctx.db.get(playlistId);
    if (!playlist) throw new Error("Playlist not found");

    let code = generateCode();
    while (await getLobbyByCode(ctx, code)) code = generateCode();

    const now = Date.now();
    const lobbyId = await ctx.db.insert("lobbies", {
      code,
      hostSessionId: host.sessionId,
      playlistId,
      status: "waiting",
      currentRound: 0,
      totalRounds: TOTAL_ROUNDS,
      usedTrackIds: [],
      createdAt: now,
    });
    await ctx.db.insert("players", {
      lobbyId,
      sessionId: host.sessionId,
      name,
      avatarId: host.avatarId,
      isHost: true,
      connection: "connected",
      lastSeenAt: now,
      totalScore: 0,
    });
    return { code };
  },
});

export const joinLobby = mutation({
  args: { code: v.string(), player: playerArg },
  handler: async (ctx, { code, player }) => {
    const lobby = await requireLobbyByCode(ctx, code);
    const now = Date.now();

    // Reconnection: same session rejoining (allowed in any lobby status).
    const existing = await getPlayerBySession(ctx, lobby._id, player.sessionId);
    if (existing) {
      await ctx.db.patch(existing._id, {
        connection: "connected",
        lastSeenAt: now,
      });
      return { lobbyId: lobby._id, code: lobby.code };
    }

    if (lobby.status !== "waiting" && lobby.status !== "countdown") {
      throw new Error("Game already started");
    }
    const name = validatePlayerInput(player);
    const players = await getLobbyPlayers(ctx, lobby._id);
    if (players.length >= MAX_PLAYERS) throw new Error("Lobby is full");

    await ctx.db.insert("players", {
      lobbyId: lobby._id,
      sessionId: player.sessionId,
      name,
      avatarId: player.avatarId,
      isHost: false,
      connection: "connected",
      lastSeenAt: now,
      totalScore: 0,
    });
    return { lobbyId: lobby._id, code: lobby.code };
  },
});

export const setPlaylist = mutation({
  args: { code: v.string(), playlistId: v.id("playlists"), sessionId: v.string() },
  handler: async (ctx, { code, playlistId, sessionId }) => {
    const lobby = await requireLobbyByCode(ctx, code);
    requireHost(lobby, sessionId);
    if (lobby.status !== "waiting") throw new Error("Game already starting");
    if (!(await ctx.db.get(playlistId))) throw new Error("Playlist not found");
    await ctx.db.patch(lobby._id, { playlistId });
  },
});

export const startCountdown = mutation({
  args: { code: v.string(), sessionId: v.string() },
  handler: async (ctx, { code, sessionId }) => {
    const lobby = await requireLobbyByCode(ctx, code);
    requireHost(lobby, sessionId);
    if (lobby.status !== "waiting") throw new Error("Already starting");
    const players = await getLobbyPlayers(ctx, lobby._id);
    if (players.length < 1) throw new Error("Need at least 1 player");

    const countdownEndsAt = Date.now() + COUNTDOWN_LOBBY_MS;
    const scheduledBeginId = await ctx.scheduler.runAt(
      countdownEndsAt,
      internal.game.beginGame,
      { lobbyId: lobby._id },
    );
    await ctx.db.patch(lobby._id, {
      status: "countdown",
      countdownEndsAt,
      scheduledBeginId,
    });
  },
});

export const cancelCountdown = mutation({
  args: { code: v.string(), sessionId: v.string() },
  handler: async (ctx, { code, sessionId }) => {
    const lobby = await requireLobbyByCode(ctx, code);
    requireHost(lobby, sessionId);
    if (lobby.status !== "countdown") return;
    if (lobby.scheduledBeginId) await ctx.scheduler.cancel(lobby.scheduledBeginId);
    await ctx.db.patch(lobby._id, {
      status: "waiting",
      countdownEndsAt: undefined,
      scheduledBeginId: undefined,
    });
  },
});

/**
 * Primary subscription for the lobby + game screens.
 * Returns NO secrets and NO session ids (a session id is a player's identity).
 */
export const lobbyState = query({
  args: { code: v.string(), sessionId: v.string() },
  handler: async (ctx, { code, sessionId }) => {
    const lobby = await getLobbyByCode(ctx, code);
    if (!lobby) return null;
    const players = await getLobbyPlayers(ctx, lobby._id);
    const playlist = await ctx.db.get(lobby.playlistId);
    const you = players.find((p) => p.sessionId === sessionId);
    return {
      serverNow: Date.now(),
      lobby: {
        code: lobby.code,
        status: lobby.status,
        countdownEndsAt: lobby.countdownEndsAt,
        currentRound: lobby.currentRound,
        totalRounds: lobby.totalRounds,
        playlist: playlist
          ? {
              _id: playlist._id,
              name: playlist.name,
              description: playlist.description,
              trackCount: playlist.trackCount,
              minYear: playlist.minYear,
              maxYear: playlist.maxYear,
            }
          : null,
      },
      players: players.map((p) => ({
        _id: p._id,
        name: p.name,
        avatarId: p.avatarId,
        isHost: p.isHost,
        connection: p.connection,
        totalScore: p.totalScore,
      })),
      you: you
        ? { playerId: you._id, isHost: you.isHost, name: you.name }
        : null,
    };
  },
});

export const heartbeat = mutation({
  args: { code: v.string(), sessionId: v.string() },
  handler: async (ctx, { code, sessionId }) => {
    const lobby = await getLobbyByCode(ctx, code);
    if (!lobby) return;
    const now = Date.now();
    const player = await getPlayerBySession(ctx, lobby._id, sessionId);
    if (player) {
      await ctx.db.patch(player._id, { connection: "connected", lastSeenAt: now });
    }
    // Piggyback: flip anyone whose heartbeat went stale, so other clients
    // see disconnects reactively without a cron.
    await syncConnectionFlags(ctx, lobby._id, now);
  },
});
