import { useEffect } from "react";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../theme";

interface VinylRecordProps {
  size?: number;
  spinning?: boolean;
}

/** The signature spinning-vinyl motif (spec §11): Home hero + "now playing". */
export function VinylRecord({ size = 96, spinning = false }: VinylRecordProps) {
  const { colors } = useTheme();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (spinning) {
      rotation.value = withRepeat(
        withTiming(rotation.value + 360, { duration: 2400, easing: Easing.linear }),
        -1,
      );
    } else {
      cancelAnimation(rotation);
    }
    return () => cancelAnimation(rotation);
  }, [spinning, rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const c = size / 2;
  // Grooves: faint concentric rings between the rim and the label.
  const grooves = [0.86, 0.74, 0.62, 0.5].map((f) => c * f);

  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={c} fill={colors.surfaceUp} />
        <Circle cx={c} cy={c} r={c - 1} stroke={colors.border} strokeWidth={1} fill="none" />
        {grooves.map((r) => (
          <Circle key={r} cx={c} cy={c} r={r} stroke={colors.faint} strokeOpacity={0.35} strokeWidth={1} fill="none" />
        ))}
        {/* Label + spindle hole; an off-center notch makes the spin visible. */}
        <Circle cx={c} cy={c} r={c * 0.34} fill={colors.accent} />
        <Circle cx={c} cy={c - c * 0.22} r={c * 0.045} fill={colors.onAccent} opacity={0.9} />
        <Circle cx={c} cy={c} r={c * 0.07} fill={colors.bg} />
      </Svg>
    </Animated.View>
  );
}
