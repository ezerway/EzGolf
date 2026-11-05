import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";

import { cardFace } from "@/components/button-face";
import { useT } from "@/i18n";
import { useCoursesStore } from "@/stores/courses";
import { formatHoleCount } from "@/utils/hole-facts";
import { themeVars, usePalette, useScheme } from "@/theme";

export function CoursePlayScreen({ id }: { id: number }) {
  const course = useCoursesStore((state) => state.courses.find((item) => item.id === id));
  const status = useCoursesStore((state) => state.status);
  const load = useCoursesStore((state) => state.load);
  const onlyLayout = course?.layouts.length === 1 ? course.layouts[0] : null;
  const t = useT();
  const palette = usePalette();
  const scheme = useScheme();

  useEffect(() => {
    if (status === "loading") {
      void load();
    }
  }, [load, status]);

  useEffect(() => {
    if (!onlyLayout) {
      return;
    }
    router.replace({
      pathname: "/[id]/round",
      params: { id: String(id), layoutId: String(onlyLayout.id) },
    });
  }, [id, onlyLayout]);

  if (!course || course.layouts.length <= 1) {
    return (
      <View className="flex-1 items-center justify-center px-8" style={themeVars[scheme]}>
        <Stack.Screen options={{ title: t("nav.chooseCourse") }} />
        <Text className="text-center text-base" style={{ color: palette.text }}>
          {!course && status === "ready"
            ? t("course.unavailable")
            : course && course.layouts.length === 0
              ? t("play.noCourses")
              : t("play.opening")}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={themeVars[scheme]}>
      <Stack.Screen options={{ title: t("nav.chooseCourse") }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-3 px-4 py-6">
        {course.layouts.map((layout) => (
          <Pressable
            key={layout.id}
            onPress={() =>
              router.push({
                pathname: "/[id]/round",
                params: { id: String(id), layoutId: String(layout.id) },
              })
            }
            className="px-4 py-4"
            style={cardFace(palette)}
          >
            <Text className="text-base font-semibold" style={{ color: palette.text }}>{layout.name}</Text>
            <Text className="mt-1 text-sm" style={{ color: palette.muted }}>{formatHoleCount(layout.holes.length, t)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

