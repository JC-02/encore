import { View } from "react-native";
import { useTheme } from "../theme";
import { Avatar } from "./avatar";
import { Body, Heading, Label } from "./text";

interface ScoreRowProps {
  rank: number;
  name: string;
  avatarId: string;
  score: number;
  isYou?: boolean;
}

export function ScoreRow({ rank, name, avatarId, score, isYou }: ScoreRowProps) {
  const { colors, radius, sp } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: sp(3),
        backgroundColor: colors.surface,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: isYou ? colors.accent : colors.border,
        paddingVertical: sp(2),
        paddingHorizontal: sp(3),
      }}
    >
      <Label tone={rank <= 3 ? "accent" : "faint"} style={{ width: 24, textAlign: "center" }}>
        #{rank}
      </Label>
      <Avatar avatarId={avatarId} size={32} />
      <Body weight={isYou ? "semibold" : "medium"} numberOfLines={1} style={{ flex: 1 }}>
        {name}
        {isYou ? " (you)" : ""}
      </Body>
      <Heading level="h2">{score}</Heading>
    </View>
  );
}
