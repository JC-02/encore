import { View } from "react-native";
import { useTheme } from "../theme";
import { Card } from "./card";
import { Body, Heading, Label } from "./text";

export interface PlaylistSummary {
  name: string;
  description: string;
  trackCount: number;
  minYear: number;
  maxYear: number;
}

interface PlaylistCardProps {
  playlist: PlaylistSummary;
  selected?: boolean;
  onPress?: () => void;
  /** Hide the description (the lobby's compact host picker). */
  compact?: boolean;
  testID?: string;
}

/** The playlist tile shared by Host setup and the Lobby (DRY: one source). */
export function PlaylistCard({ playlist, selected, onPress, compact, testID }: PlaylistCardProps) {
  const { sp } = useTheme();
  return (
    <Card testID={testID} selected={selected} onPress={onPress}>
      <View style={{ gap: sp(1) }}>
        <Heading level="h2">{playlist.name}</Heading>
        {!compact && <Body tone="sub">{playlist.description}</Body>}
        <Label size="caption" tone="faint">
          {playlist.trackCount} tracks · {playlist.minYear}–{playlist.maxYear}
        </Label>
      </View>
    </Card>
  );
}
