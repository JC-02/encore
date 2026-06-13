import { useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { TextInput, View } from "react-native";
import {
  Banner,
  Button,
  Heading,
  Label,
  ProfileForm,
  ProfileValue,
  Screen,
} from "../components";
import { api } from "../convex/_generated/api";
import { AVATAR_IDS, CODE_ALPHABET, CODE_LENGTH } from "../lib/constants";
import { saveProfile } from "../lib/session";
import { useSessionId } from "../hooks/use-session-id";
import { useTheme } from "../theme";

/** Friendly copy for the join failure modes (spec §13.3). */
function joinErrorMessage(raw: string): string {
  if (raw.includes("not found")) return "No lobby with that code — double-check it";
  if (raw.includes("full")) return "That lobby is full (12 players max)";
  if (raw.includes("started")) return "That game has already started";
  return raw;
}

export default function JoinSetup() {
  const router = useRouter();
  const { colors, radius, sp, font, fontSize } = useTheme();
  const params = useLocalSearchParams<{ code?: string }>();
  const sessionId = useSessionId();
  const joinLobby = useMutation(api.lobbies.joinLobby);

  const [code, setCode] = useState((params.code ?? "").toUpperCase());
  const [profile, setProfile] = useState<ProfileValue>({
    name: "",
    avatarId: AVATAR_IDS[0],
    valid: false,
  });
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sanitizeCode = (raw: string) =>
    raw
      .toUpperCase()
      .split("")
      .filter((c) => CODE_ALPHABET.includes(c))
      .slice(0, CODE_LENGTH)
      .join("");

  const canJoin = code.length === CODE_LENGTH && profile.valid && !!sessionId && !joining;

  const onJoin = async () => {
    if (!canJoin || !sessionId) return;
    setJoining(true);
    setError(null);
    try {
      await saveProfile({ name: profile.name, avatarId: profile.avatarId });
      const result = await joinLobby({
        code,
        player: { name: profile.name, avatarId: profile.avatarId, sessionId },
      });
      router.replace(`/lobby/${result.code}`);
    } catch (e) {
      setError(joinErrorMessage(e instanceof Error ? e.message : "Couldn't join"));
      setJoining(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ gap: sp(6) }}>
        {error && <Banner text={error} variant="danger" />}
        <Heading>Join a game</Heading>

        <View style={{ gap: sp(2) }}>
          <Label uppercase>Lobby code</Label>
          <TextInput
            value={code}
            onChangeText={(raw) => setCode(sanitizeCode(raw))}
            placeholder="ABCD"
            placeholderTextColor={colors.faint}
            autoCapitalize="characters"
            autoCorrect={false}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.tile,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.ink,
              fontFamily: font.display,
              fontSize: fontSize.h1,
              letterSpacing: 8,
              textAlign: "center",
              paddingVertical: sp(3),
            }}
          />
        </View>

        <ProfileForm value={profile} onChange={setProfile} />
        <Button testID="join-lobby" title="Join" onPress={onJoin} disabled={!canJoin} loading={joining} />
      </View>
    </Screen>
  );
}
