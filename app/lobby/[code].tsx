import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import {
  Banner,
  Body,
  Button,
  Card,
  CodeDisplay,
  CountdownOverlay,
  Heading,
  Label,
  LoadingScreen,
  PlayerChip,
  PlaylistCard,
  Screen,
} from "../../components";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { errMessage } from "../../lib/errors";
import { useConnected } from "../../hooks/use-connection";
import { useGameClock } from "../../hooks/use-game-clock";
import { useHeartbeat } from "../../hooks/use-heartbeat";
import { useSessionId } from "../../hooks/use-session-id";
import { useTheme } from "../../theme";

export default function Lobby() {
  const router = useRouter();
  const { sp } = useTheme();
  const { code } = useLocalSearchParams<{ code: string }>();
  const sessionId = useSessionId();
  const connected = useConnected();

  const state = useQuery(
    api.lobbies.lobbyState,
    code && sessionId ? { code, sessionId } : "skip",
  );
  const playlists = useQuery(api.lobbies.defaultPlaylists);
  const setPlaylist = useMutation(api.lobbies.setPlaylist);
  const startCountdown = useMutation(api.lobbies.startCountdown);
  const cancelCountdown = useMutation(api.lobbies.cancelCountdown);

  useHeartbeat(code, sessionId);
  const clock = useGameClock(state?.serverNow);
  const [error, setError] = useState<string | null>(null);

  // Game begins → move everyone to the game screen.
  useEffect(() => {
    if (state?.lobby.status === "in_game") router.replace(`/game/${code}`);
  }, [state?.lobby.status, code, router]);

  if (!sessionId || state === undefined) {
    return <LoadingScreen />;
  }

  if (state === null) {
    return (
      <Screen center>
        <View style={{ gap: sp(4), alignItems: "center" }}>
          <Heading level="h2">Lobby not found</Heading>
          <Body tone="sub">It may have ended, or the code is wrong.</Body>
          <Button title="Back to Home" variant="ghost" onPress={() => router.replace("/")} />
        </View>
      </Screen>
    );
  }

  if (!state.you) {
    return (
      <Screen center>
        <View style={{ gap: sp(4), alignItems: "center" }}>
          <Heading level="h2">You’re not in this lobby</Heading>
          <Button title="Join it" onPress={() => router.replace(`/join?code=${code}`)} />
        </View>
      </Screen>
    );
  }

  const { lobby, players, you } = state;
  const isCountdown = lobby.status === "countdown";
  const secondsLeft = isCountdown && lobby.countdownEndsAt
    ? Math.ceil((lobby.countdownEndsAt - clock.now()) / 1000)
    : 0;

  const callHost = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errMessage(e));
    }
  };

  return (
    <Screen scroll>
      <View style={{ gap: sp(6) }}>
        {!connected && <Banner text="Reconnecting…" variant="danger" />}
        {error && <Banner text={error} variant="danger" />}

        <CodeDisplay code={lobby.code} />

        <View style={{ gap: sp(2) }}>
          <Label uppercase>
            Players ({players.length})
          </Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(2) }}>
            {players.map((p) => (
              <PlayerChip
                key={p._id}
                name={p.name}
                avatarId={p.avatarId}
                isHost={p.isHost}
                disconnected={p.connection === "disconnected"}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: sp(2) }}>
          <Label uppercase>Playlist</Label>
          {you.isHost ? (
            playlists?.map((p) => (
              <PlaylistCard
                key={p._id}
                playlist={p}
                compact
                selected={p._id === lobby.playlist?._id}
                onPress={() =>
                  callHost(() =>
                    setPlaylist({ code: lobby.code, playlistId: p._id as Id<"playlists">, sessionId }),
                  )
                }
              />
            ))
          ) : (
            <Card>
              <View style={{ gap: sp(1) }}>
                <Heading level="h2">{lobby.playlist?.name ?? "…"}</Heading>
                <Body tone="sub">{lobby.playlist?.description ?? ""}</Body>
              </View>
            </Card>
          )}
        </View>

        {you.isHost ? (
          <Button
            testID="start-match"
            title="Start Match"
            onPress={() => callHost(() => startCountdown({ code: lobby.code, sessionId }))}
            disabled={players.length < 1 || lobby.status !== "waiting"}
          />
        ) : (
          <Body tone="sub" align="center">
            Waiting for the host to start…
          </Body>
        )}
      </View>

      {isCountdown && (
        <CountdownOverlay secondsLeft={secondsLeft} label="Game starts in">
          {you.isHost && (
            <Button
              testID="cancel-countdown"
              title="Cancel"
              variant="ghost"
              size="md"
              onPress={() => callHost(() => cancelCountdown({ code: lobby.code, sessionId }))}
            />
          )}
        </CountdownOverlay>
      )}
    </Screen>
  );
}
