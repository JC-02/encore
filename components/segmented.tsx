import { Pressable, View } from "react-native";
import { useTheme } from "../theme";
import { Body } from "./text";

export interface SegmentedItem<K extends string> {
  key: K;
  label: string;
  /** Shows a small dot when this section has an answer picked. */
  done?: boolean;
}

interface SegmentedProps<K extends string> {
  items: SegmentedItem<K>[];
  value: K;
  onChange: (key: K) => void;
}

/** Title / Artist / Year tab control (spec §11). */
export function Segmented<K extends string>({ items, value, onChange }: SegmentedProps<K>) {
  const { colors, radius, sp } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surfaceUp,
        borderRadius: radius.pill,
        padding: sp(1),
        gap: sp(1),
      }}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            testID={`segment-${item.key}`}
            onPress={() => onChange(item.key)}
            style={{
              flex: 1,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: sp(1),
              backgroundColor: active ? colors.accent : "transparent",
              borderRadius: radius.pill,
              paddingVertical: sp(2),
            }}
          >
            <Body size="body" weight="semibold" tone={active ? "onAccent" : "sub"}>
              {item.label}
            </Body>
            {item.done && (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: radius.pill,
                  backgroundColor: active ? colors.onAccent : colors.success,
                }}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
