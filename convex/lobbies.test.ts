// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const playlist = {
  name: "Test Playlist",
  description: "For tests",
  tags: ["default"],
  trackCount: 40,
  minYear: 1990,
  maxYear: 2020,
  isDefault: true,
};

describe("lobbies", () => {
  it("creates a lobby, joins a guest, and never leaks a sessionId", async () => {
    const t = convexTest(schema);
    const playlistId = await t.run((ctx) => ctx.db.insert("playlists", playlist));

    const { code } = await t.mutation(api.lobbies.createLobby, {
      playlistId,
      host: { name: "Hosty", avatarId: "vinyl", sessionId: "s-host" },
    });
    expect(code).toHaveLength(4);

    await t.mutation(api.lobbies.joinLobby, {
      code,
      player: { name: "Guest", avatarId: "mic", sessionId: "s-guest" },
    });

    const state = await t.query(api.lobbies.lobbyState, { code, sessionId: "s-host" });
    expect(state?.players).toHaveLength(2);
    // sessionId is the only identity token, so it must never reach a client.
    expect(JSON.stringify(state)).not.toContain("s-guest");
  });

  it("rejects an invalid display name server-side", async () => {
    const t = convexTest(schema);
    const playlistId = await t.run((ctx) => ctx.db.insert("playlists", playlist));
    await expect(
      t.mutation(api.lobbies.createLobby, {
        playlistId,
        host: { name: "ab", avatarId: "vinyl", sessionId: "s-host" },
      }),
    ).rejects.toThrow();
  });
});
