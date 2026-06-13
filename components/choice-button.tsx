import { Pressable, View } from "react-native";
import { useTheme } from "../theme";
import { Body } from "./text";

export type ChoiceState = "default" | "selected" | "correct" | "incorrect";

interface ChoiceButtonProps {
  label: string;
  state: ChoiceState;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * Answer tile (spec §11): single-accent selection — surface fill + empty radio
 * by default, accent fill + check when selected, success/danger at reveal.
 */
export function ChoiceButton({ label, state, onPress, disabled, testID }: ChoiceButtonProps) {
  const { colors, radius, sp } = useTheme();

  const palette = {
    default: { bg: colors.surface, border: colors.border, text: colors.ink },
    selected: { bg: colors.accent, border: colors.accent, text: colors.onAccent },
    correct: { bg: "transparent", border: colors.success, text: colors.success },
    incorrect: { bg: "transparent", border: colors.danger, text: colors.danger },
  }[state];

  const mark = state === "selected" ? "✓" : state === "correct" ? "✓" : state === "incorrect" ? "✕" : null;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: sp(3),
        backgroundColor: palette.bg,
        borderRadius: radius.tile,
        borderWidth: state === "correct" || state === "incorrect" ? 2 : 1,
        borderColor: palette.border,
        paddingVertical: sp(3),
        paddingHorizontal: sp(4),
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: radius.pill,
          borderWidth: mark ? 0 : 2,
          borderColor: colors.faint,
          backgroundColor: mark ? palette.border : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {mark && (
          <Body size="body" weight="bold" tone={state === "selected" ? "onAccent" : "ink"} style={{ fontSize: 12, lineHeight: 14 }}>
            {mark}
          </Body>
        )}
      </View>
      <Body
        weight={state === "default" ? "medium" : "semibold"}
        style={{ color: palette.text, flex: 1 }}
        numberOfLines={2}
      >
        {label}
      </Body>
    </Pressable>
  );
}
