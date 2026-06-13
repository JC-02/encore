import { ReactNode } from "react";
import { Pressable, View, ViewStyle } from "react-native";
import { useTheme } from "../theme";

interface CardProps {
  children: ReactNode;
  /** surface = default card; raised = surfaceUp (now-playing, wheel band). */
  variant?: "surface" | "raised";
  /** Accent hairline + tint when selected (playlist picker). */
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export function Card({ children, variant = "surface", selected, onPress, style, testID }: CardProps) {
  const { colors, radius, sp } = useTheme();
  const base: ViewStyle = {
    backgroundColor: variant === "raised" ? colors.surfaceUp : colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: selected ? colors.accent : colors.border,
    padding: sp(4),
  };
  if (!onPress) return <View testID={testID} style={[base, style]}>{children}</View>;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]}
    >
      {children}
    </Pressable>
  );
}
