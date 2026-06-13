import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { useTheme } from "../theme";
import { Avatar } from "./avatar";
import { Body, Label } from "./text";

interface PlayerChipProps {
  name: string;
  avatarId: string;
  isHost?: boolean;
  disconnected?: boolean;
}

/** Lobby roster entry; joins/leaves animate, disconnected players dim. */
export function PlayerChip({ name, avatarId, isHost, disconnected }: PlayerChipProps) {
  const { colors, radius, sp, motion } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.duration(motion.base)}
      exiting={FadeOut.duration(motion.fast)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: sp(3),
        backgroundColor: colors.surface,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: sp(2),
        paddingHorizontal: sp(3),
        opacity: disconnected ? 0.4 : 1,
      }}
    >
      <Avatar avatarId={avatarId} size={32} />
      <Body weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>
        {name}
      </Body>
      {isHost && (
        <Label size="caption" tone="accentCyan" uppercase>
          Host
        </Label>
      )}
      {disconnected && (
        <Label size="caption" tone="faint">
          offline
        </Label>
      )}
    </Animated.View>
  );
}
