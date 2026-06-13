import { useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  View,
} from "react-native";
import { useTheme } from "../theme";
import { Heading, Label } from "./text";

const TICK_WIDTH = 18;
const BAND_HEIGHT = 72;

interface YearWheelProps {
  min: number;
  max: number;
  value: number;
  onChange: (year: number) => void;
  disabled?: boolean;
  /** Reveal mode: highlight the true year; the wheel pins to it. */
  correctYear?: number;
}

/**
 * Horizontal wheel snapping to whole years (spec §8.2) — one of the two
 * signature interactions. surfaceUp band, faint ticks, accent center pill.
 */
export function YearWheel({ min, max, value, onChange, disabled, correctYear }: YearWheelProps) {
  const { colors, radius, sp } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const years: number[] = [];
  for (let y = min; y <= max; y++) years.push(y);

  const sidePad = Math.max(0, width / 2 - TICK_WIDTH / 2);
  const indexOf = (year: number) => Math.min(years.length - 1, Math.max(0, year - min));

  // Align once the container width (and thus side padding) is measured —
  // the initial contentOffset renders before padding exists.
  useEffect(() => {
    if (width > 0) {
      const target = correctYear ?? value;
      scrollRef.current?.scrollTo({
        x: indexOf(target) * TICK_WIDTH,
        animated: correctYear !== undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correctYear, width]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (disabled || correctYear !== undefined) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / TICK_WIDTH);
    const year = years[Math.min(years.length - 1, Math.max(0, index))];
    if (year !== value) onChange(year);
  };

  const shown = correctYear ?? value;
  const pillColor = correctYear !== undefined ? colors.success : colors.accent;

  return (
    <View style={{ gap: sp(2) }}>
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            backgroundColor: pillColor,
            borderRadius: radius.pill,
            paddingHorizontal: sp(4),
            paddingVertical: sp(1),
          }}
        >
          <Heading level="h2" tone="onAccent">
            {shown}
          </Heading>
        </View>
      </View>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          backgroundColor: colors.surfaceUp,
          borderRadius: radius.tile,
          height: BAND_HEIGHT,
          overflow: "hidden",
        }}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={TICK_WIDTH}
          decelerationRate="fast"
          scrollEnabled={!disabled && correctYear === undefined}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          contentOffset={{ x: indexOf(value) * TICK_WIDTH, y: 0 }}
          contentContainerStyle={{ paddingHorizontal: sidePad, alignItems: "center" }}
        >
          {years.map((year) => {
            const major = year % 5 === 0;
            const active = year === shown;
            return (
              <View key={year} style={{ width: TICK_WIDTH, alignItems: "center", gap: 4 }}>
                <View
                  style={{
                    width: 2,
                    height: major ? 26 : 14,
                    borderRadius: 1,
                    backgroundColor: active ? pillColor : colors.faint,
                  }}
                />
                <Label size="caption" tone={active ? "accentCyan" : "faint"}>
                  {major ? String(year).slice(2) : " "}
                </Label>
              </View>
            );
          })}
        </ScrollView>
        {/* Center pointer */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: "50%",
            marginLeft: -1,
            top: 4,
            width: 2,
            height: 12,
            backgroundColor: pillColor,
            borderRadius: 1,
          }}
        />
      </View>
    </View>
  );
}
