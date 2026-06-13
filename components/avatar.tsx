import { Pressable, Text, View } from "react-native";
import { AvatarId } from "../lib/constants";
import { useTheme } from "../theme";

// Preset avatars are rendered from semantic-token tints + a music glyph,
// keyed by the validated avatarId (spec §10).
const AVATAR_GLYPHS: Record<AvatarId, string> = {
  vinyl: "💿",
  mic: "🎤",
  headphones: "🎧",
  guitar: "🎸",
  drums: "🥁",
  keys: "🎹",
  sax: "🎷",
  trumpet: "🎺",
};

const TINT_KEYS = ["accent", "accentPink", "accentCyan", "success"] as const;

interface AvatarProps {
  avatarId: string;
  size?: number;
  selected?: boolean;
  onPress?: () => void;
  dimmed?: boolean;
}

export function Avatar({ avatarId, size = 48, selected, onPress, dimmed }: AvatarProps) {
  const { colors, radius } = useTheme();
  const ids = Object.keys(AVATAR_GLYPHS);
  const index = Math.max(0, ids.indexOf(avatarId));
  const tint = colors[TINT_KEYS[index % TINT_KEYS.length]];
  const glyph = AVATAR_GLYPHS[avatarId as AvatarId] ?? "🎵";

  const circle = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceUp,
        borderWidth: 2,
        borderColor: selected ? colors.accent : tint + "55",
        alignItems: "center",
        justifyContent: "center",
        opacity: dimmed ? 0.4 : 1,
      }}
    >
      <Text style={{ fontSize: size * 0.5, lineHeight: size * 0.7 }}>{glyph}</Text>
    </View>
  );
  if (!onPress) return circle;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      {circle}
    </Pressable>
  );
}
