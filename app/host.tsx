import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import {
  Banner,
  Body,
  Button,
  Card,
  Heading,
  Label,
  PlaylistCard,
  ProfileForm,
  ProfileValue,
  Screen,
} from "../components";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { AVATAR_IDS } from "../lib/constants";
import { errMessage } from "../lib/errors";
import { saveProfile } from "../lib/session";
import { useSessionId } from "../hooks/use-session-id";
import { useTheme } from "../theme";

export default function HostSetup() {
  const router = useRouter();
  const { colors, sp } = useTheme();
  const sessionId = useSessionId();
  const playlists = useQuery(api.lobbies.defaultPlaylists);
  const createLobby = useMutation(api.lobbies.createLobby);

  const [playlistId, setPlaylistId] = useState<Id<"playlists"> | null>(null);
  const [profile, setProfile] = useState<ProfileValue>({
    name: "",
    avatarId: AVATAR_IDS[0],
    valid: false,
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedId = playlistId ?? playlists?.[0]?._id ?? null;
  const canCreate = !!selectedId && profile.valid && !!sessionId && !creating;

  const onCreate = async () => {
    if (!canCreate || !selectedId || !sessionId) return;
    setCreating(true);
    setError(null);
    try {
      await saveProfile({ name: profile.name, avatarId: profile.avatarId });
      const { code } = await createLobby({
        playlistId: selectedId,
        host: { name: profile.name, avatarId: profile.avatarId, sessionId },
      });
      router.replace(`/lobby/${code}`);
    } catch (e) {
      setError(errMessage(e, "Couldn't create the lobby, try again"));
      setCreating(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ gap: sp(6) }}>
        {error && <Banner text={error} variant="danger" />}
        <Heading>Host a game</Heading>

        <View style={{ gap: sp(2) }}>
          <Label uppercase>Playlist</Label>
          {playlists === undefined && (
            <View style={{ paddingVertical: sp(6), alignItems: "center" }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          )}
          {playlists?.length === 0 && (
            <Card>
              <Body tone="sub" align="center">
                No playlists yet. The default playlists haven’t been baked into
                this deployment.
              </Body>
            </Card>
          )}
          {playlists?.map((p) => (
            <PlaylistCard
              key={p._id}
              testID={`playlist-${p.name.replace(/\s+/g, "-").toLowerCase()}`}
              playlist={p}
              selected={p._id === selectedId}
              onPress={() => setPlaylistId(p._id)}
            />
          ))}
        </View>

        <ProfileForm value={profile} onChange={setProfile} />
        <Button
          testID="create-lobby"
          title="Create Lobby"
          onPress={onCreate}
          disabled={!canCreate}
          loading={creating}
        />
      </View>
    </Screen>
  );
}
