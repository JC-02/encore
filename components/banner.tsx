import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useTheme } from "../theme";
import { Body } from "./text";

interface BannerProps {
  text: string;
  variant?: "info" | "danger" | "success";
}

/** Connection/error strip pinned at the top of a screen (spec §13 global). */
export function Banner({ text, variant = "info" }: BannerProps) {
  const { colors, radius, sp, motion } = useTheme();
  const bg = {
    info: colors.surfaceUp,
    danger: colors.danger,
    success: colors.success,
  }[variant];
  const tone = variant === "info" ? "sub" : "onAccent";
  return (
    <Animated.View
      entering={FadeInUp.duration(motion.base)}
      exiting={FadeOutUp.duration(motion.fast)}
      style={{
        backgroundColor: bg,
        borderRadius: radius.sm,
        paddingVertical: sp(2),
        paddingHorizontal: sp(4),
      }}
    >
      <Body size="body" weight="medium" tone={tone} align="center">
        {text}
      </Body>
    </Animated.View>
  );
}
