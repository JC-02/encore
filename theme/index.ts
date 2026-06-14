// "Spotlight" design tokens (spec §11). The ONLY place raw design values live.
// Tokens are semantic so a light palette can be added later as a sibling
// object swapped through ThemeProvider; components never touch raw hex.

import { createContext, useContext } from "react";

export const darkColors = {
  bg: "#0E0E13", // app background
  surface: "#191921", // cards, answer tiles
  surfaceUp: "#22222C", // raised: now-playing card, segmented control, wheel band
  border: "rgba(255,255,255,0.08)", // hairline on dark
  ink: "#FFFFFF", // primary text
  sub: "#9A9AAC", // secondary text
  faint: "#5A5A68", // hints, inactive ticks
  accent: "#7C6CFF", // PRIMARY: buttons, selection, highlights
  accentPink: "#EC4899", // secondary accent: win/podium flourishes (sparing)
  accentCyan: "#22D3EE", // tertiary: year-wheel label, info
  onAccent: "#FFFFFF", // text/icon on accent fills
  success: "#3DD6C4", // correct answer at reveal
  danger: "#FF5D6C", // wrong answer at reveal
} as const;

export type ThemeColors = typeof darkColors;

// Font family tokens map to the loaded expo-google-fonts faces.
export const font = {
  display: "SpaceGrotesk_700Bold", // wordmark + headings
  displayMedium: "SpaceGrotesk_500Medium",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  bodyExtraBold: "Inter_800ExtraBold", // display fallback
} as const;

export const fontSize = {
  display: 48,
  h1: 28,
  h2: 20,
  title: 16,
  body: 15,
  label: 13,
  caption: 11,
} as const;

/** Base-4 spacing scale: sp(1)=4 … sp(7)=32. */
export const spacingScale = [4, 8, 12, 16, 20, 24, 32] as const;
export const sp = (step: 1 | 2 | 3 | 4 | 5 | 6 | 7) => spacingScale[step - 1];

export const radius = {
  sm: 10,
  tile: 14,
  card: 18,
  button: 16,
  pill: 999,
} as const;

export const motion = {
  fast: 120,
  base: 220,
  slow: 360,
  easing: "ease-out",
} as const;

export interface Theme {
  colors: ThemeColors;
  font: typeof font;
  fontSize: typeof fontSize;
  radius: typeof radius;
  motion: typeof motion;
  sp: typeof sp;
}

export const darkTheme: Theme = {
  colors: darkColors,
  font,
  fontSize,
  radius,
  motion,
  sp,
};

// Light mode later = a second palette passed to this provider; no refactor.
const ThemeContext = createContext<Theme>(darkTheme);
export const ThemeProvider = ThemeContext.Provider;
export const useTheme = () => useContext(ThemeContext);
