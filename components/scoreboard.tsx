import { View } from "react-native";
import { useTheme } from "../theme";
import { ScoreRow } from "./score-row";
import { Label } from "./text";

export interface ScoreboardRow {
  rank: number;
  playerId: string;
  name: string;
  avatarId: string;
  totalScore: number;
  isYou?: boolean;
}

/** Top-3-plus-self standings shown during the reveal pause (spec §13.6). */
export function Scoreboard({ rows }: { rows: ScoreboardRow[] }) {
  const { sp } = useTheme();
  return (
    <View style={{ gap: sp(2) }}>
      <Label uppercase>Standings</Label>
      {rows.map((r) => (
        <ScoreRow
          key={r.playerId}
          rank={r.rank}
          name={r.name}
          avatarId={r.avatarId}
          score={r.totalScore}
          isYou={r.isYou}
        />
      ))}
    </View>
  );
}
