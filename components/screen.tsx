import { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";

interface ScreenProps {
  children: ReactNode;
  /** Scrollable content (setup screens) vs. fixed layout (game). */
  scroll?: boolean;
  /** Center children vertically (Home, overlays). */
  center?: boolean;
}

/** Page shell: bg color, safe areas, and a centered phone-width column on web. */
export function Screen({ children, scroll = false, center = false }: ScreenProps) {
  const { colors, sp } = useTheme();
  const insets = useSafeAreaInsets();

  const frame = {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
  };
  const column = [
    styles.column,
    { paddingHorizontal: sp(5), paddingVertical: sp(4) },
    center && styles.center,
  ];

  if (scroll) {
    return (
      <View style={frame}>
        <ScrollView
          contentContainerStyle={[column, styles.scrollGrow]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    );
  }
  return (
    <View style={frame}>
      <View style={[column, styles.fill]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: "100%",
    maxWidth: 520, // phone-like column on desktop web
    alignSelf: "center",
  },
  fill: { flex: 1 },
  scrollGrow: { flexGrow: 1 },
  center: { justifyContent: "center" },
});
