import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useTheme } from "../theme";
import { Heading, Label } from "./text";

interface CountdownOverlayProps {
  /** Big center number (3·2·1 sync, or lobby seconds remaining). */
  secondsLeft: number;
  label?: string;
  /** Extra content under the number (e.g. the host's Cancel button). */
  children?: ReactNode;
}

export function CountdownOverlay({ secondsLeft, label, children }: CountdownOverlayProps) {
  const { colors, sp, motion } = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(motion.base)}
      style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.bg + "F2" }]}
    >
      <View style={{ alignItems: "center", gap: sp(4) }}>
        {label && <Label uppercase>{label}</Label>}
        <Animated.View key={secondsLeft} entering={ZoomIn.duration(motion.base)}>
          <Heading level="display" tone="accent" style={{ fontSize: 96, lineHeight: 104 }}>
            {Math.max(0, secondsLeft)}
          </Heading>
        </Animated.View>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { alignItems: "center", justifyContent: "center", zIndex: 10 },
});
