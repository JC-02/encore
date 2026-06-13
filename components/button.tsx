import { ActivityIndicator, Pressable, ViewStyle } from "react-native";
import { useTheme } from "../theme";
import { Body } from "./text";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
  size?: "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  disabled,
  loading,
  style,
  testID,
}: ButtonProps) {
  const { colors, radius, sp } = useTheme();
  const blocked = disabled || loading;

  const fill: ViewStyle =
    variant === "primary"
      ? { backgroundColor: colors.accent }
      : variant === "danger"
        ? { backgroundColor: colors.danger }
        : { backgroundColor: "transparent", borderWidth: 2, borderColor: colors.ink };
  const textTone = variant === "ghost" ? "ink" : "onAccent";

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [
        {
          borderRadius: radius.button,
          paddingVertical: size === "lg" ? sp(4) : sp(3),
          paddingHorizontal: sp(6),
          alignItems: "center",
          justifyContent: "center",
          opacity: blocked ? 0.45 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        fill,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Body size="title" weight="semibold" tone={textTone}>
          {title}
        </Body>
      )}
    </Pressable>
  );
}
