import { View } from "react-native";
import { useTheme } from "../theme";
import { Heading, Label } from "./text";

/** The prominent 4-char join code in the lobby. */
export function CodeDisplay({ code }: { code: string }) {
  const { colors, radius, sp } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: sp(2) }}>
      <Label uppercase>Join code</Label>
      <View
        style={{
          backgroundColor: colors.surfaceUp,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: sp(3),
          paddingHorizontal: sp(6),
        }}
      >
        <Heading testID="lobby-code" level="display" style={{ letterSpacing: 12 }}>
          {code}
        </Heading>
      </View>
    </View>
  );
}
