import { useCallback } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { buttonFace, cardFace } from "@/components/button-face";
import { useLanguage, useT, type Translate } from "@/i18n";
import { useRoundsStore, type HoleScore, type RoundSummary, type ScoreField } from "@/stores/rounds";
import { asFeatureKind, featureLabelKey, isTeeKind } from "@/utils/feature-kinds";
import { holeFacts } from "@/utils/hole-facts";
import { formatPlayed } from "@/utils/played-at";
import { themeVars, usePalette, useScheme } from "@/theme";

export function ScorecardScreen() {
  const { roundId } = useLocalSearchParams<{ roundId?: string }>();
  const selectedId = Number(roundId);
  if (roundId && Number.isFinite(selectedId)) {
    return <ScorecardDetail roundId={selectedId} />;
  }
  return <ScorecardList />;
}

function ScorecardList() {
  const rounds = useRoundsStore((state) => state.rounds);
  const status = useRoundsStore((state) => state.status);
  const load = useRoundsStore((state) => state.load);
  const insets = useSafeAreaInsets();
  const scheme = useScheme();
  const palette = usePalette();
  const t = useT();

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View testID="screen-scorecard" className="flex-1 bg-background" style={[{ paddingTop: insets.top }, themeVars[scheme]]}>
      <Text
        className={process.env.EXPO_OS === "android" ? "px-4 pb-3 pt-1 text-2xl font-semibold" : "px-5 pb-4 pt-2 text-3xl font-bold"}
        style={{ color: palette.text }}
      >
        {t("scorecard.title")}
      </Text>
      <FlatList
        data={rounds}
        keyExtractor={(round) => String(round.id)}
        contentContainerStyle={{
          paddingBottom: process.env.EXPO_OS === "android" ? 16 : insets.bottom + 24,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <Text className="px-5 pt-6 text-base" style={{ color: palette.muted }}>
            {status === "loading" ? t("scorecard.loading") : t("scorecard.empty")}
          </Text>
        }
        renderItem={({ item }) => <ScorecardRow round={item} />}
      />
    </View>
  );
}

function ScorecardRow({ round }: { round: RoundSummary }) {
  const t = useT();
  const language = useLanguage();
  const palette = usePalette();
  const layoutLabel = round.layoutName !== round.courseName ? round.layoutName : null;
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/scorecard", params: { roundId: String(round.id) } })}
      className="mx-4 mb-3 flex-row items-center gap-4 p-4"
      style={cardFace(palette)}
    >
      <View className="flex-1">
        <Text className="text-lg font-semibold" style={{ color: palette.text }}>{round.courseName}</Text>
        {layoutLabel ? <Text className="mt-1 text-sm" style={{ color: palette.muted }}>{layoutLabel}</Text> : null}
        <Text className="mt-2 text-sm" style={{ color: palette.muted }}>
          {t("scorecard.summary", {
            tee: teeLabel(round.tee, t),
            putts: round.putts > 0 ? round.putts : "–",
            fir: round.fir,
            gir: round.gir,
          })}
        </Text>
        <Text className="mt-1 text-sm" style={{ color: palette.muted }}>
          {formatPlayed(round.startedAt, language)} · {t("scorecard.progress", { played: round.holesPlayed, count: round.holeCount })}
        </Text>
      </View>
      <Text className="text-3xl font-semibold" style={{ color: palette.tint }}>{round.strokes > 0 ? round.strokes : "–"}</Text>
    </Pressable>
  );
}

function ScorecardDetail({ roundId }: { roundId: number }) {
  const rounds = useRoundsStore((state) => state.rounds);
  const holes = useRoundsStore((state) => state.holes);
  const activeRoundId = useRoundsStore((state) => state.activeRoundId);
  const load = useRoundsStore((state) => state.load);
  const loadScores = useRoundsStore((state) => state.loadScores);
  const setScore = useRoundsStore((state) => state.setScore);
  const setMark = useRoundsStore((state) => state.setMark);
  const clearScores = useRoundsStore((state) => state.clearScores);
  const insets = useSafeAreaInsets();
  const t = useT();
  const palette = usePalette();
  const scheme = useScheme();
  const round = rounds.find((item) => item.id === roundId);
  const visibleHoles = activeRoundId === roundId ? holes : [];
  const total = visibleHoles.reduce((sum, hole) => sum + (hole.strokes ?? 0), 0);
  const putts = visibleHoles.reduce((sum, hole) => sum + (hole.putts ?? 0), 0);
  const penalty = visibleHoles.reduce((sum, hole) => sum + (hole.penalty ?? 0), 0);
  const firCount = visibleHoles.filter((hole) => hole.fir === true).length;
  const girCount = visibleHoles.filter((hole) => hole.gir === true).length;

  useFocusEffect(
    useCallback(() => {
      void load().then(() => loadScores(roundId));
    }, [load, loadScores, roundId]),
  );

  function changeScore(hole: HoleScore, field: ScoreField, delta: number) {
    const next = (hole[field] ?? 0) + delta;
    void setScore(roundId, hole.holeId, field, next < 1 ? null : next);
  }

  function confirmNewRound() {
    Alert.alert(t("scorecard.newRoundTitle"), t("scorecard.newRoundBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("scorecard.newRound"), style: "destructive", onPress: () => void clearScores(roundId) },
    ]);
  }

  return (
    <View className="flex-1 bg-background" style={[{ paddingTop: insets.top }, themeVars[scheme]]}>
      <View className="flex-row items-center gap-3 px-4 pb-4 pt-2">
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.setParams({ roundId: "" });
          }}
          className="px-4 py-2"
          style={buttonFace(palette, "card")}
        >
          <Text className="text-base font-semibold" style={{ color: palette.text }}>{t("common.back")}</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold" style={{ color: palette.text }}>{round?.courseName ?? t("scorecard.title")}</Text>
          {round && round.layoutName !== round.courseName ? (
            <Text className="text-sm" style={{ color: palette.muted }}>{round.layoutName}</Text>
          ) : null}
        </View>
      </View>
      <FlatList
        data={visibleHoles}
        keyExtractor={(hole) => String(hole.holeId)}
        contentContainerStyle={{
          paddingBottom: process.env.EXPO_OS === "android" ? 108 : insets.bottom + 120,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <Text className="px-5 pt-6 text-base" style={{ color: palette.muted }}>
            {activeRoundId === roundId ? t("scorecard.noHoles") : t("scorecard.loadingOne")}
          </Text>
        }
        renderItem={({ item }) => {
          const facts = holeFacts(item, t);
          return (
            <View className="mx-4 mb-3 gap-3 px-4 py-3" style={cardFace(palette)}>
              <View>
                <Text className="text-base font-semibold" style={{ color: palette.text }}>{item.name}</Text>
                {facts ? <Text className="mt-1 text-sm" style={{ color: palette.muted }}>{facts}</Text> : null}
              </View>
              <ScoreLine label={t("scorecard.strokes")} value={item.strokes} onChange={(delta) => changeScore(item, "strokes", delta)} />
              <ScoreLine label={t("scorecard.putts")} value={item.putts} onChange={(delta) => changeScore(item, "putts", delta)} />
              <ScoreLine label={t("scorecard.penalty")} value={item.penalty} onChange={(delta) => changeScore(item, "penalty", delta)} />
              <View className="flex-row gap-2">
                <MarkChip
                  label="FIR"
                  value={item.fir}
                  onPress={() => void setMark(roundId, item.holeId, "fir", cycleMark(item.fir))}
                />
                <MarkChip
                  label="GIR"
                  value={item.gir}
                  onPress={() => void setMark(roundId, item.holeId, "gir", cycleMark(item.gir))}
                />
              </View>
            </View>
          );
        }}
      />
      <View
        className="absolute inset-x-0 bottom-0 flex-row items-center justify-between px-5 pt-3"
        style={{ paddingBottom: process.env.EXPO_OS === "android" ? 12 : insets.bottom + 12, backgroundColor: palette.background }}
      >
        <View>
          <Text className="text-sm" style={{ color: palette.muted }}>{t("scorecard.total")}</Text>
          <Text className="text-2xl font-bold" style={{ color: palette.tint }}>{total > 0 ? total : "–"}</Text>
          <Text className="text-sm" style={{ color: palette.muted }}>
            {t("scorecard.footer", {
              putts: putts > 0 ? putts : "–",
              penalty: penalty > 0 ? penalty : "–",
              fir: firCount,
              gir: girCount,
            })}
          </Text>
        </View>
        <Pressable onPress={confirmNewRound} className="px-4 py-3" style={buttonFace(palette, "card")}>
          <Text className="text-sm font-semibold" style={{ color: palette.text }}>{t("scorecard.newRound")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function teeLabel(kind: string | null, t: Translate) {
  const parsed = kind == null ? null : asFeatureKind(kind);
  if (parsed && isTeeKind(parsed)) {
    return t(featureLabelKey[parsed]);
  }
  return t("scorecard.teeUnknown");
}

function cycleMark(value: boolean | null) {
  if (value == null) {
    return true;
  }
  if (value) {
    return false;
  }
  return null;
}

function markLabel(value: boolean | null, t: Translate) {
  if (value == null) {
    return "–";
  }
  return value ? t("common.yes") : t("common.no");
}

function MarkChip({ label, value, onPress }: { label: string; value: boolean | null; onPress: () => void }) {
  const t = useT();
  const palette = usePalette();
  const selected = value === true;
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center justify-between px-4 py-3"
      style={buttonFace(palette, selected ? "tint" : "surface")}
    >
      <Text className="text-sm font-semibold" style={{ color: selected ? palette.onTint : palette.muted }}>{label}</Text>
      <Text className="text-sm font-semibold" style={{ color: selected ? palette.onTint : palette.text }}>{markLabel(value, t)}</Text>
    </Pressable>
  );
}

function ScoreLine({ label, value, onChange }: { label: string; value: number | null; onChange: (delta: number) => void }) {
  const palette = usePalette();
  return (
    <View className="flex-row items-center gap-3">
      <Text className="flex-1 text-sm" style={{ color: palette.muted }}>{label}</Text>
      <Pressable onPress={() => onChange(-1)} className="h-11 w-11 items-center justify-center" style={buttonFace(palette, "surface")}>
        <Text className="text-xl font-semibold" style={{ color: palette.text }}>−</Text>
      </Pressable>
      <Text className="w-8 text-center text-lg font-semibold" style={{ color: palette.text }}>{value ?? "–"}</Text>
      <Pressable onPress={() => onChange(1)} className="h-11 w-11 items-center justify-center" style={buttonFace(palette, "tint")}>
        <Text className="text-xl font-semibold text-on-tint">+</Text>
      </Pressable>
    </View>
  );
}
