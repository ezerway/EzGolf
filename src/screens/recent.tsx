import { useCallback } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage, useT } from "@/i18n";
import { useRoundsStore, type RoundSummary } from "@/stores/rounds";
import { formatPlayed } from "@/utils/played-at";

export function RecentScreen() {
  const rounds = useRoundsStore((state) => state.rounds);
  const status = useRoundsStore((state) => state.status);
  const load = useRoundsStore((state) => state.load);
  const insets = useSafeAreaInsets();
  const t = useT();

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <Text className="px-5 pb-4 pt-2 text-3xl font-bold text-ink">{t("recent.title")}</Text>
      <FlatList
        data={rounds}
        keyExtractor={(round) => String(round.id)}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, flexGrow: 1 }}
        ListEmptyComponent={
          <Text className="px-5 pt-6 text-base text-muted">
            {status === "loading" ? t("recent.loading") : t("recent.empty")}
          </Text>
        }
        renderItem={({ item }) => <RecentRow round={item} />}
      />
    </View>
  );
}

function RecentRow({ round }: { round: RoundSummary }) {
  const language = useLanguage();
  const layoutLabel = round.layoutName !== round.courseName ? round.layoutName : null;
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/[id]/round",
          params: { id: String(round.courseId), layoutId: String(round.layoutId) },
        })
      }
      className="mx-4 mb-3 rounded-2xl bg-card p-4"
      style={{ borderCurve: "continuous" }}
    >
      <Text className="text-lg font-semibold text-ink">{round.courseName}</Text>
      {layoutLabel ? <Text className="mt-1 text-sm text-muted">{layoutLabel}</Text> : null}
      <Text className="mt-2 text-sm font-semibold text-tint">{formatPlayed(round.startedAt, language)}</Text>
    </Pressable>
  );
}
