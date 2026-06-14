import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ---- Pre-baked content (spec §9) ----
  playlists: defineTable({
    name: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    trackCount: v.number(),
    minYear: v.number(),
    maxYear: v.number(), // curated so (maxYear - minYear) >= 25 in v0
    isDefault: v.boolean(),
  }),

  tracks: defineTable({
    playlistId: v.id("playlists"),
    deezerId: v.number(),
    title: v.string(),
    artist: v.string(),
    albumCoverUrl: v.string(),
    previewUrl: v.string(), // 30s MP3
    releaseYear: v.number(), // MusicBrainz first-release-date year (verified)
    explicit: v.boolean(),
  }).index("by_playlist", ["playlistId"]),

  // MusicBrainz lookup cache so re-running prebake is cheap (spec §9 step 2).
  // `year: null` records a confident-miss so we don't re-query failures.
  mbYearCache: defineTable({
    key: v.string(), // "artist|title", lowercased
    year: v.union(v.number(), v.null()),
  }).index("by_key", ["key"]),

  // ---- Live game state ----
  lobbies: defineTable({
    code: v.string(), // unique, 4 chars, unambiguous alphabet
    hostSessionId: v.string(),
    playlistId: v.id("playlists"),
    status: v.union(
      v.literal("waiting"),
      v.literal("countdown"),
      v.literal("in_game"),
      v.literal("finished"),
    ),
    countdownEndsAt: v.optional(v.number()), // server ms
    scheduledBeginId: v.optional(v.id("_scheduled_functions")), // for cancelCountdown
    currentRound: v.number(), // 0 until in_game
    totalRounds: v.number(),
    usedTrackIds: v.array(v.id("tracks")), // no repeats within a game
    createdAt: v.number(),
  }).index("by_code", ["code"]),

  players: defineTable({
    lobbyId: v.id("lobbies"),
    sessionId: v.string(), // client-generated anonymous id (persisted locally)
    name: v.string(),
    avatarId: v.string(),
    isHost: v.boolean(),
    connection: v.union(v.literal("connected"), v.literal("disconnected")),
    lastSeenAt: v.number(),
    totalScore: v.number(),
  })
    .index("by_lobby", ["lobbyId"])
    .index("by_lobby_session", ["lobbyId", "sessionId"])
    .index("by_session", ["sessionId"]),

  rounds: defineTable({
    lobbyId: v.id("lobbies"),
    roundNumber: v.number(),
    trackId: v.id("tracks"),
    titleChoices: v.array(v.string()), // 5, shuffled (CLIENT-VISIBLE)
    artistChoices: v.array(v.string()), // 5, shuffled (CLIENT-VISIBLE)
    wheelMin: v.number(),
    wheelMax: v.number(),
    band: v.number(), // ±N for partial credit
    clipStartOffset: v.number(), // seconds into the 30s preview
    playAt: v.number(), // server ms when audio should start
    endsAt: v.number(), // server ms when answer window closes
    status: v.union(v.literal("playing"), v.literal("revealed")),
    // revealed-only:
    revealTitle: v.optional(v.string()),
    revealArtist: v.optional(v.string()),
    revealYear: v.optional(v.number()),
    revealCoverUrl: v.optional(v.string()),
  })
    .index("by_lobby", ["lobbyId"])
    .index("by_lobby_round", ["lobbyId", "roundNumber"]),

  // SECRET: read only by server mutations. Never returned by a client-facing
  // query while the round is "playing" (rule R6).
  roundSecrets: defineTable({
    roundId: v.id("rounds"),
    correctTitleIndex: v.number(),
    correctArtistIndex: v.number(),
    correctYear: v.number(),
  }).index("by_round", ["roundId"]),

  submissions: defineTable({
    roundId: v.id("rounds"),
    playerId: v.id("players"),
    titleIndex: v.number(),
    artistIndex: v.number(),
    yearGuess: v.number(),
    submittedAt: v.number(), // SERVER receipt time
    titleCorrect: v.boolean(),
    artistCorrect: v.boolean(),
    yearPoints: v.number(), // 3, 1, or 0
    roundPoints: v.number(),
  })
    .index("by_round", ["roundId"])
    .index("by_round_player", ["roundId", "playerId"]),
});
