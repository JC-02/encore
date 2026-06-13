import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../theme";
import { Avatar } from "./avatar";
import { Body, Heading, Label } from "./text";

interface PodiumPlayer {
  name: string;
  avatarId: string;
  totalScore: number;
}

/** Winner avatar gets a gentle celebratory bounce (the one allowed animation). */
function Bouncing({ children }: { children: React.ReactNode }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 420, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function Column({
  player,
  place,
  height,
  delay,
}: {
  player?: PodiumPlayer;
  place: 1 | 2 | 3;
  height: number;
  delay: number;
}) {
  const { colors, radius, sp, motion } = useTheme();
  if (!player) return <View style={{ flex: 1 }} />;
  const isWinner = place === 1;
  const avatar = (
    <Avatar avatarId={player.avatarId} size={isWinner ? 64 : 48} />
  );
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(motion.slow)}
      style={{ flex: 1, alignItems: "center", gap: sp(2), justifyContent: "flex-end" }}
    >
      {isWinner ? <Bouncing>{avatar}</Bouncing> : avatar}
      <Body weight="semibold" numberOfLines={1}>
        {player.name}
      </Body>
      <View
        style={{
          alignSelf: "stretch",
          height,
          backgroundColor: isWinner ? colors.accent : colors.surfaceUp,
          borderTopLeftRadius: radius.tile,
          borderTopRightRadius: radius.tile,
          alignItems: "center",
          paddingTop: sp(2),
          gap: sp(1),
        }}
      >
        <Heading level="h2" tone={isWinner ? "onAccent" : "sub"}>
          {place}
        </Heading>
        <Label tone={isWinner ? "onAccent" : "accentPink"}>{player.totalScore} pts</Label>
      </View>
    </Animated.View>
  );
}

/** Top-3 podium: 2nd · 1st · 3rd, winner on the accent column (spec §13.7). */
export function Podium({ players }: { players: PodiumPlayer[] }) {
  const { sp } = useTheme();
  const [first, second, third] = players;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: sp(3) }}>
      <Column player={second} place={2} height={84} delay={200} />
      <Column player={first} place={1} height={120} delay={0} />
      <Column player={third} place={3} height={60} delay={400} />
    </View>
  );
}
