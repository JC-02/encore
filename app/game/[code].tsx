import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import {
  Banner,
  Body,
  Button,
  Card,
  ChoiceButton,
  ChoiceState,
  CountdownOverlay,
  Heading,
  Label,
  LoadingScreen,
  NowPlayingCard,
  Podium,
  Scoreboard,
  ScoreRow,
  Screen,
  Segmented,
  Timer,
  YearWheel,
} from "../../components";
import { api } from "../../convex/_generated/api";
import { useConnected } from "../../hooks/use-connection";
import { useGameClock } from "../../hooks/use-game-clock";
import { useHeartbeat } from "../../hooks/use-heartbeat";
import { useSessionId } from "../../hooks/use-session-id";
import { useSyncedAudio } from "../../hooks/use-synced-audio";
import { ANSWER_WINDOW_MS } from "../../lib/constants";
import { errMessage } from "../../lib/errors";
import { useTheme } from "../../theme";

type Tab = "title" | "artist" | "year";

export default function Game() {
  const router = useRouter();
  const { colors, sp } = useTheme();
  const { code } = useLocalSearchParams<{ code: string }>();
  const sessionId = useSessionId();
  const connected = useConnected();

  const state = useQuery(
    api.lobbies.lobbyState,
    code && sessionId ? { code, sessionId } : "skip",
  );
  const round = useQuery(
    api.game.roundView,
    code && sessionId ? { code, sessionId } : "skip",
  );
  const results = useQuery(
    api.game.finalResults,
    state?.lobby.status === "finished" && code ? { code } : "skip",
  );
  const submitAnswer = useMutation(api.game.submitAnswer);
  const playAgain = useMutation(api.game.playAgain);

  useHeartbeat(code, sessionId);
  const clock = useGameClock(round?.serverNow ?? state?.serverNow);

  // Local answers, reset for each round.
  const [tab, setTab] = useState<Tab>("title");
  const [titleIndex, setTitleIndex] = useState<number | null>(null);
  const [artistIndex, setArtistIndex] = useState<number | null>(null);
  const [yearGuess, setYearGuess] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Reset answers when the round changes. This is React's documented "adjust
  // state on prop change during render" pattern (no effect, no extra paint).
  const roundId = round?.roundId ?? null;
  const [answeredRound, setAnsweredRound] = useState(roundId);
  if (roundId !== answeredRound) {
    setAnsweredRound(roundId);
    setTab("title");
    setTitleIndex(null);
    setArtistIndex(null);
    setYearGuess(null);
    setSubmitting(false);
    setError(null);
  }

  // Back to the lobby after "Play Again".
  useEffect(() => {
    if (state?.lobby.status === "waiting" || state?.lobby.status === "countdown") {
      router.replace(`/lobby/${code}`);
    }
  }, [state?.lobby.status, code, router]);

  const now = clock.now();
  const playing = round?.status === "playing";
  const audio = useSyncedAudio({
    previewUrl: round?.previewUrl ?? null,
    clipStartOffset: round?.clipStartOffset ?? 0,
    playAt: round?.playAt ?? null,
    serverNow: clock.now,
    active: !!playing,
  });

  if (!sessionId || state === undefined) {
    return <LoadingScreen />;
  }
  if (state === null || !state.you) {
    return (
      <Screen center>
        <View style={{ gap: sp(4), alignItems: "center" }}>
          <Heading level="h2">Game not found</Heading>
          <Button title="Back to Home" variant="ghost" onPress={() => router.replace("/")} />
        </View>
      </Screen>
    );
  }

  // ---------- Podium ----------
  if (state.lobby.status === "finished") {
    return (
      <Screen scroll>
        <View style={{ gap: sp(6) }}>
          {!connected && <Banner text="Reconnecting…" variant="danger" />}
          <Heading align="center">Final results</Heading>
          {results === undefined || results === null ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <Podium players={results.slice(0, 3)} />
              <View style={{ gap: sp(2) }}>
                <Label uppercase>Full standings</Label>
                {results.map((r) => (
                  <ScoreRow
                    key={r.playerId}
                    rank={r.rank}
                    name={r.name}
                    avatarId={r.avatarId}
                    score={r.totalScore}
                    isYou={r.playerId === state.you?.playerId}
                  />
                ))}
              </View>
            </>
          )}
          <View style={{ gap: sp(3) }}>
            {state.you.isHost && (
              <Button
                testID="play-again"
                title="Play Again"
                onPress={() =>
                  playAgain({ code: state.lobby.code, sessionId }).catch((e) =>
                    setError(errMessage(e, "Couldn't restart")),
                  )
                }
              />
            )}
            <Button title="Back to Home" variant="ghost" onPress={() => router.replace("/")} />
          </View>
          {error && <Banner text={error} variant="danger" />}
        </View>
      </Screen>
    );
  }

  // ---------- Waiting for the first round ----------
  if (!round) {
    return <LoadingScreen message="Building the first round…" />;
  }

  const revealed = round.status === "revealed";
  const preRoll = playing && now < round.playAt;
  const secondsLeft = Math.ceil((round.endsAt - now) / 1000);
  const fraction = (round.endsAt - now) / ANSWER_WINDOW_MS;
  const submitted = !!round.yourSubmission;
  const wheelDefault = Math.round((round.wheelMin + round.wheelMax) / 2);

  const choiceState = (
    kind: "title" | "artist",
    index: number,
  ): ChoiceState => {
    const picked = kind === "title" ? titleIndex : artistIndex;
    const yourPick =
      round.yourSubmission?.[kind === "title" ? "titleIndex" : "artistIndex"];
    if (revealed) {
      const correctLabel = kind === "title" ? round.reveal!.title : round.reveal!.artist;
      const choices = kind === "title" ? round.titleChoices : round.artistChoices;
      if (choices[index] === correctLabel) return "correct";
      if (yourPick === index) return "incorrect";
      return "default";
    }
    const effective = submitted ? yourPick : picked;
    return effective === index ? "selected" : "default";
  };

  const onSubmit = async () => {
    if (titleIndex === null || artistIndex === null || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitAnswer({
        roundId: round.roundId,
        sessionId,
        answer: {
          titleIndex,
          artistIndex,
          yearGuess: yearGuess ?? wheelDefault,
        },
      });
    } catch (e) {
      setError(errMessage(e, "Couldn't submit, try again"));
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ gap: sp(5) }}>
        {!connected && <Banner text="Reconnecting…" variant="danger" />}
        {error && <Banner text={error} variant="danger" />}
        {audio.audioFailed && playing && (
          <Pressable onPress={audio.retry}>
            <Banner text="Audio unavailable. Tap to retry, or answer anyway." variant="info" />
          </Pressable>
        )}

        {/* Header: round, timer, mute */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Label uppercase>
              Round {round.roundNumber} of {round.totalRounds}
            </Label>
            {playing && !submitted && (
              <Label size="caption" tone="faint">
                Title +1 · Artist +2 · Year +3
              </Label>
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp(3) }}>
            {playing && !preRoll && (
              <Timer fraction={fraction} secondsLeft={secondsLeft} size={56} />
            )}
            <Pressable onPress={audio.toggleMute} hitSlop={8}>
              <Heading level="h2">{audio.muted ? "🔇" : "🔊"}</Heading>
            </Pressable>
          </View>
        </View>

        <NowPlayingCard
          caption={revealed ? "It was" : "Now playing"}
          title={
            revealed
              ? `${round.reveal!.title} · ${round.reveal!.artist} (${round.reveal!.year})`
              : "Mystery track"
          }
          playing={!!playing && !preRoll && audio.isPlaying}
        />

        {/* Reveal: your points + scoreboard */}
        {revealed && round.yourSubmission && (
          <Card variant="raised">
            <Heading level="h2" align="center" tone="accent">
              You earned +{round.yourSubmission.roundPoints ?? 0}
            </Heading>
          </Card>
        )}
        {revealed && !round.yourSubmission && (
          <Card variant="raised">
            <Body align="center" tone="sub">
              No answer this round
            </Body>
          </Card>
        )}

        {/* Answers: tabs while playing; everything visible at reveal */}
        {!revealed && (
          <Segmented<Tab>
            items={[
              { key: "title", label: "Title", done: titleIndex !== null || submitted },
              { key: "artist", label: "Artist", done: artistIndex !== null || submitted },
              { key: "year", label: "Year", done: yearGuess !== null || submitted },
            ]}
            value={tab}
            onChange={setTab}
          />
        )}

        {(revealed || tab === "title") && (
          <View style={{ gap: sp(2) }}>
            {revealed && <Label uppercase>Title</Label>}
            {round.titleChoices.map((label, i) => (
              <ChoiceButton
                key={i}
                testID={`title-choice-${i}`}
                label={label}
                state={choiceState("title", i)}
                disabled={submitted || revealed}
                onPress={() => setTitleIndex(i)}
              />
            ))}
          </View>
        )}
        {(revealed || tab === "artist") && (
          <View style={{ gap: sp(2) }}>
            {revealed && <Label uppercase>Artist</Label>}
            {round.artistChoices.map((label, i) => (
              <ChoiceButton
                key={i}
                testID={`artist-choice-${i}`}
                label={label}
                state={choiceState("artist", i)}
                disabled={submitted || revealed}
                onPress={() => setArtistIndex(i)}
              />
            ))}
          </View>
        )}
        {(revealed || tab === "year") && (
          <View style={{ gap: sp(2) }}>
            {revealed && (
              <Label uppercase>
                Year (you said {round.yourSubmission?.yearGuess ?? "nothing"})
              </Label>
            )}
            <YearWheel
              min={round.wheelMin}
              max={round.wheelMax}
              value={yearGuess ?? round.yourSubmission?.yearGuess ?? wheelDefault}
              onChange={setYearGuess}
              disabled={submitted}
              correctYear={revealed ? round.reveal!.year : undefined}
            />
          </View>
        )}

        {revealed && round.reveal && <Scoreboard rows={round.reveal.scoreboard} />}

        {/* Submit / locked-in */}
        {playing && !preRoll && !submitted && (
          <Button
            testID="submit-answer"
            title="Submit"
            onPress={onSubmit}
            disabled={titleIndex === null || artistIndex === null}
            loading={submitting}
          />
        )}
        {playing && submitted && (
          <Card>
            <Body align="center" tone="sub">
              Locked in, waiting for others ({round.submittedCount}/{round.connectedCount})
            </Body>
          </Card>
        )}
      </View>

      {preRoll && (
        <CountdownOverlay
          secondsLeft={Math.ceil((round.playAt - now) / 1000)}
          label={`Round ${round.roundNumber}`}
        />
      )}
    </Screen>
  );
}
