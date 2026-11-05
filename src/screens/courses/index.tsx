import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Share, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import Animated, { FadeIn, LinearTransition, ReduceMotion, useReducedMotion } from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { File, Paths } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { buttonFace, cardFace } from "@/components/button-face";
import { CourseRow } from "@/components/course-row";
import { useT } from "@/i18n";
import { useCoursesStore, type Course } from "@/stores/courses";
import { useSettingsStore } from "@/stores/settings";
import { usePalette, useScheme, themeVars } from "@/theme";
import { formatKilometers, kilometersAway, type LatLng } from "@/utils/coordinates";
import { parseCoursesFile } from "@/utils/import-courses";

const listTransition = LinearTransition.duration(200).reduceMotion(ReduceMotion.System);

export function CoursesScreen() {
  const [query, setQuery] = useState("");
  const [here, setHere] = useState<LatLng | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const palette = usePalette();
  const scheme = useScheme();
  const t = useT();
  const courses = useCoursesStore((state) => state.courses);
  const status = useCoursesStore((state) => state.status);
  const error = useCoursesStore((state) => state.error);
  const load = useCoursesStore((state) => state.load);
  const importCourses = useCoursesStore((state) => state.importCourses);
  const exportData = useCoursesStore((state) => state.exportData);
  const removeCourse = useCoursesStore((state) => state.removeCourse);
  const developerMode = useSettingsStore((state) => state.developerMode);
  const settingsReady = useSettingsStore((state) => state.ready);
  const canManage = settingsReady && developerMode;
  const visibleCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return courses;
    }
    return courses.filter((course) => {
      return (
        course.name.toLowerCase().includes(normalized) ||
        course.address.toLowerCase().includes(normalized)
      );
    });
  }, [courses, query]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void readLocation().then((point) => {
        if (!cancelled && point) {
          setHere(point);
        }
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  async function importFile() {
    setNotice(null);
    const picked = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled) {
      return;
    }
    setImporting(true);
    try {
      const text = await new File(picked.assets[0].uri).text();
      const count = await importCourses(parseCoursesFile(text));
      setNotice(t(count === 1 ? "courses.importedOne" : "courses.importedMany", { count }));
    } catch (importError) {
      setNotice(importError instanceof Error ? importError.message : t("courses.importFailed"));
    } finally {
      setImporting(false);
    }
  }

  async function exportFile() {
    setNotice(null);
    setExporting(true);
    try {
      const json = await exportData();
      const file = new File(Paths.cache, `ezgolf-${Date.now()}.json`);
      file.create({ intermediates: true, overwrite: true });
      await file.write(json);
      const result =
        Platform.OS === "ios"
          ? await Share.share({ url: file.uri, title: t("courses.exportTitle") })
          : await Share.share({ title: t("courses.exportTitle"), message: json });
      if (result.action === Share.sharedAction) {
        setNotice(t("courses.exported"));
      }
    } catch (exportError) {
      setNotice(exportError instanceof Error ? exportError.message : t("courses.exportFailed"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <View className="flex-1 bg-background" style={themeVars[scheme]}>
      <CoursesBrand reducedMotion={reducedMotion} topInset={insets.top} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t("courses.search")}
        placeholderTextColor={palette.muted}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        underlineColorAndroid="transparent"
        textAlignVertical="center"
        className="mx-4 mb-3 h-12 rounded-2xl px-4 text-base"
        style={{ backgroundColor: palette.card, color: palette.text }}
      />
      <Animated.FlatList
        style={{ flex: 1 }}
        data={status === "ready" ? visibleCourses : []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }: { item: Course }) => (
          <CourseRow
            course={item}
            distance={courseDistance(here, item)}
            onOpen={(id) => router.push({ pathname: "/[id]", params: { id: String(id) } })}
            onRemove={
              canManage
                ? (id) => {
                    void removeCourse(id).catch((removeError) => {
                      setNotice(
                        removeError instanceof Error ? removeError.message : t("courses.removeFailed"),
                      );
                    });
                  }
                : undefined
            }
          />
        )}
        itemLayoutAnimation={listTransition}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingTop: 4,
          paddingBottom: process.env.EXPO_OS === "android" ? 16 : insets.bottom + 96,
          flexGrow: visibleCourses.length === 0 ? 1 : undefined,
        }}
        ListHeaderComponent={
          canManage || notice ? (
            <View className="gap-3 px-4 pb-3">
              {canManage ? (
                <View className="flex-row flex-wrap gap-2">
                  <Pressable
                    onPress={() => router.push("/add")}
                    className="min-h-12 min-w-[30%] flex-1 items-center justify-center px-4 py-3"
                    style={buttonFace(palette, "tint")}
                  >
                    <Text className="text-sm font-semibold text-on-tint">{t("courses.add")}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void importFile()}
                    disabled={importing || exporting}
                    className="min-h-12 min-w-[30%] flex-1 items-center justify-center px-4 py-3"
                    style={buttonFace(palette, "outline")}
                  >
                    <Text className="text-sm font-semibold" style={{ color: palette.tint }}>{importing ? t("courses.importing") : t("courses.import")}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void exportFile()}
                    disabled={importing || exporting || courses.length === 0}
                    className="min-h-12 min-w-[30%] flex-1 items-center justify-center px-4 py-3"
                    style={buttonFace(palette, "outline")}
                  >
                    <Text className="text-sm font-semibold" style={{ color: palette.tint }}>{exporting ? t("courses.exporting") : t("courses.export")}</Text>
                  </Pressable>
                </View>
              ) : null}
              {notice ? (
                <Text className="text-sm" style={{ color: palette.muted }} selectable>
                  {notice}
                </Text>
              ) : null}
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          status === "loading" ? (
            <View className="gap-3 px-4">
              <SkeletonRow />
              <SkeletonRow />
            </View>
          ) : status === "error" ? (
            <StatusMessage title={t("courses.openFailed")} body={error ?? t("courses.retryHint")} onRetry={() => void load()} />
          ) : (
            <EmptyCourses query={query} reducedMotion={reducedMotion} canManage={canManage} />
          )
        }
      />
    </View>
  );
}

function CoursesBrand({ reducedMotion, topInset }: { reducedMotion: boolean; topInset: number }) {
  const android = process.env.EXPO_OS === "android";
  const palette = usePalette();
  const mark = android ? 56 : 88;
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel="EzGolf"
      className={android ? "flex-row items-center gap-3 px-4 pb-3" : "flex-row items-center gap-4 px-5 pb-4"}
      style={{ paddingTop: topInset + (android ? 4 : 8) }}
    >
      <View
        style={{
          width: mark,
          height: mark,
          borderRadius: android ? 16 : 24,
          borderCurve: "continuous",
          overflow: "hidden",
          backgroundColor: "#25292e",
        }}
      >
        <LottieView
          source={require("../../../assets/animations/launch.json")}
          autoPlay={!reducedMotion}
          loop={!reducedMotion}
          style={{ width: mark, height: mark }}
        />
      </View>
      <Text className={android ? "text-2xl font-bold" : "text-4xl font-bold"} style={{ color: palette.text }}>EzGolf</Text>
    </View>
  );
}

function courseDistance(here: LatLng | null, course: Course) {
  if (!here) {
    return null;
  }
  const corners =
    course.corners && course.corners.length > 0
      ? course.corners
      : (course.layouts.find((layout) => layout.corners && layout.corners.length > 0)?.corners ?? null);
  const kilometers = kilometersAway(here, corners);
  return kilometers == null ? null : formatKilometers(kilometers);
}

async function readLocation() {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status !== "granted") {
      if (current.canAskAgain === false) {
        return null;
      }
      const asked = await Location.requestForegroundPermissionsAsync();
      if (asked.status !== "granted") {
        return null;
      }
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
}

function EmptyCourses({
  query,
  reducedMotion,
  canManage,
}: {
  query: string;
  reducedMotion: boolean;
  canManage: boolean;
}) {
  const t = useT();
  const palette = usePalette();
  const trimmed = query.trim();
  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(220)}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}
    >
      <LottieView
        source={require("../../../assets/animations/search-empty.json")}
        autoPlay={!reducedMotion}
        loop={!reducedMotion}
        style={{ width: 140, height: 140 }}
      />
      <Text className="text-center text-base" style={{ color: palette.text }}>
        {trimmed ? t("courses.emptyMatch", { query: trimmed }) : t("courses.empty")}
      </Text>
      <Text className="mt-2 text-center text-sm" style={{ color: palette.muted }}>
        {trimmed
          ? t("courses.emptyHint")
          : canManage
            ? t("courses.emptyManage")
            : t("courses.emptyLocked")}
      </Text>
    </Animated.View>
  );
}

function StatusMessage({ title, body, onRetry }: { title: string; body: string; onRetry: () => void }) {
  const t = useT();
  const palette = usePalette();
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8">
      <Text className="text-center text-lg font-semibold" style={{ color: palette.text }}>{title}</Text>
      <Text className="text-center text-sm" style={{ color: palette.muted }} selectable>
        {body}
      </Text>
      <Pressable onPress={onRetry} className="mt-2 px-5 py-3" style={buttonFace(palette, "tint")}>
        <Text className="text-base font-semibold text-on-tint">{t("courses.tryAgain")}</Text>
      </Pressable>
    </View>
  );
}

function SkeletonRow() {
  const palette = usePalette();
  return (
    <View className="flex-row gap-3 p-3" style={cardFace(palette)}>
      <View className="h-24 w-24 rounded-2xl" style={{ backgroundColor: palette.background }} />
      <View className="flex-1 justify-center gap-2">
        <View className="h-4 w-3/4 rounded-full" style={{ backgroundColor: palette.background }} />
        <View className="h-3 w-full rounded-full" style={{ backgroundColor: palette.background }} />
      </View>
    </View>
  );
}
