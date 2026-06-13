import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../theme";
import { Card } from "./card";
import { Heading, Label } from "./text";
import { VinylRecord } from "./vinyl-record";

function EqualizerBar({ index, animating }: { index: number; animating: boolean }) {
  const { colors } = useTheme();
  const height = useSharedValue(6);
  useEffect(() => {
    if (animating) {
      height.value = withDelay(
        index * 90,
        withRepeat(
          withSequence(
            withTiming(16, { duration: 280, easing: Easing.inOut(Easing.quad) }),
            withTiming(5, { duration: 280, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
        ),
      );
    } else {
      height.value = withTiming(6, { duration: 200 });
    }
  }, [animating, height, index]);
  const style = useAnimatedStyle(() => ({ height: height.value }));
  return (
    <Animated.View
      style={[{ width: 3, borderRadius: 2, backgroundColor: colors.faint }, style]}
    />
  );
}

interface NowPlayingCardProps {
  caption?: string;
  title: string;
  playing: boolean;
}

/** surfaceUp card with the spinning vinyl + a faint equalizer line (spec §11). */
export function NowPlayingCard({ caption = "Now playing", title, playing }: NowPlayingCardProps) {
  const { sp } = useTheme();
  return (
    <Card variant="raised">
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4) }}>
        <VinylRecord size={64} spinning={playing} />
        <View style={{ flex: 1, gap: sp(1) }}>
          <Label size="caption" tone="accentCyan" uppercase>
            {caption}
          </Label>
          <Heading level="h2" numberOfLines={2}>
            {title}
          </Heading>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 16 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <EqualizerBar key={i} index={i} animating={playing} />
            ))}
          </View>
        </View>
      </View>
    </Card>
  );
}
