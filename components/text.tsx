import { Text, TextProps, TextStyle } from "react-native";
import { useTheme } from "../theme";

type Tone = "ink" | "sub" | "faint" | "accent" | "accentCyan" | "accentPink" | "success" | "danger" | "onAccent";

interface TypographyProps extends TextProps {
  tone?: Tone;
  align?: TextStyle["textAlign"];
}

function useToneColor(tone: Tone) {
  const { colors } = useTheme();
  return colors[tone];
}

interface HeadingProps extends TypographyProps {
  level?: "display" | "h1" | "h2";
}

/** Display-face headings (Space Grotesk). */
export function Heading({ level = "h1", tone = "ink", align, style, ...rest }: HeadingProps) {
  const { font, fontSize } = useTheme();
  const color = useToneColor(tone);
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: font.display, fontSize: fontSize[level], color, textAlign: align },
        style,
      ]}
    />
  );
}

interface BodyProps extends TypographyProps {
  size?: "title" | "body";
  weight?: "regular" | "medium" | "semibold" | "bold";
}

const weightToFont = {
  regular: "body",
  medium: "bodyMedium",
  semibold: "bodySemiBold",
  bold: "bodyBold",
} as const;

/** Body text (Inter). */
export function Body({ size = "body", weight = "regular", tone = "ink", align, style, ...rest }: BodyProps) {
  const { font, fontSize } = useTheme();
  const color = useToneColor(tone);
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: font[weightToFont[weight]], fontSize: fontSize[size], color, textAlign: align, lineHeight: fontSize[size] * 1.45 },
        style,
      ]}
    />
  );
}

interface LabelProps extends TypographyProps {
  size?: "label" | "caption";
  uppercase?: boolean;
}

/** Small UI labels and captions (Inter semibold). */
export function Label({ size = "label", uppercase, tone = "sub", align, style, ...rest }: LabelProps) {
  const { font, fontSize } = useTheme();
  const color = useToneColor(tone);
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: font.bodySemiBold,
          fontSize: fontSize[size],
          color,
          textAlign: align,
          ...(uppercase ? { textTransform: "uppercase" as const, letterSpacing: 1.2 } : {}),
        },
        style,
      ]}
    />
  );
}
