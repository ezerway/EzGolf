import { useCallback } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cardFace } from "@/components/button-face";
import { useLanguage, useT } from "@/i18n";
import { useRoundsStore, type RoundSummary } from "@/stores/rounds";
import { formatPlayed } from "@/utils/played-at";
import { themeVars, usePalette, useScheme } from "@/theme";

export function RecentScreen() {
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
    <View testID="screen-recent" className="flex-1 bg-background" style={[{ paddingTop: insets.top }, themeVars[scheme]]}>
      <Text
        className={process.env.EXPO_OS === "android" ? "px-4 pb-3 pt-1 text-2xl font-semibold" : "px-5 pb-4 pt-2 text-3xl font-bold"}
        style={{ color: palette.text }}
      >
        {t("recent.title")}
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
  const palette = usePalette();
  const layoutLabel = round.layoutName !== round.courseName ? round.layoutName : null;
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/[id]/round",
          params: { id: String(round.courseId), layoutId: String(round.layoutId) },
        })
      }
      className="mx-4 mb-3 p-4"
      style={cardFace(palette)}
    >
      <Text className="text-lg font-semibold" style={{ color: palette.text }}>{round.courseName}</Text>
      {layoutLabel ? <Text className="mt-1 text-sm" style={{ color: palette.muted }}>{layoutLabel}</Text> : null}
      <Text className="mt-2 text-sm font-semibold" style={{ color: palette.tint }}>{formatPlayed(round.startedAt, language)}</Text>
    </Pressable>
  );
}
