import { ActivityIndicator, View } from "react-native";
import { useTheme } from "../theme";
import { Body } from "./text";
import { Screen } from "./screen";

/** Centered spinner page shared by the lobby + game loading states. */
export function LoadingScreen({ message }: { message?: string }) {
  const { colors, sp } = useTheme();
  return (
    <Screen center>
      <View style={{ alignItems: "center", gap: sp(4) }}>
        <ActivityIndicator color={colors.accent} />
        {message && <Body tone="sub">{message}</Body>}
      </View>
    </Screen>
  );
}
