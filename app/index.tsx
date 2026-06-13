import { useRouter } from "expo-router";
import { View } from "react-native";
import { Button, Heading, Label, Screen, VinylRecord } from "../components";
import { useTheme } from "../theme";

export default function Home() {
  const router = useRouter();
  const { sp } = useTheme();
  return (
    <Screen center>
      <View style={{ alignItems: "center", gap: sp(6) }}>
        <VinylRecord size={160} spinning />
        <View style={{ alignItems: "center", gap: sp(2) }}>
          <Heading level="display">Encore</Heading>
          <Label tone="sub">Hear it. Name it. Date it.</Label>
        </View>
        <View style={{ alignSelf: "stretch", gap: sp(3) }}>
          <Button title="Host Game" onPress={() => router.push("/host")} />
          <Button title="Join Game" variant="ghost" onPress={() => router.push("/join")} />
        </View>
      </View>
    </Screen>
  );
}
