import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../theme";
import { Heading } from "./text";

interface TimerProps {
  /** 1 → full ring, 0 → empty. */
  fraction: number;
  secondsLeft: number;
  size?: number;
}

/** Ring countdown for the answer window (spec §7). Parent drives the clock. */
export function Timer({ fraction, secondsLeft, size = 64 }: TimerProps) {
  const { colors } = useTheme();
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction));
  const urgent = secondsLeft <= 5;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={urgent ? colors.danger : colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </Svg>
      <Heading level="h2" tone={urgent ? "danger" : "ink"}>
        {Math.max(0, secondsLeft)}
      </Heading>
    </View>
  );
}
