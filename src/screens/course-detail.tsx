import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import * as WebBrowser from "expo-web-browser";

import { useT } from "@/i18n";
import { useCoursesStore } from "@/stores/courses";
import { useSettingsStore } from "@/stores/settings";

export function CourseDetailScreen({ id }: { id: number }) {
  const course = useCoursesStore((state) => state.courses.find((item) => item.id === id));
  const status = useCoursesStore((state) => state.status);
  const load = useCoursesStore((state) => state.load);
  const developerMode = useSettingsStore((state) => state.developerMode);
  const settingsReady = useSettingsStore((state) => state.ready);
  const t = useT();

  useEffect(() => {
    if (status === "loading") {
      void load();
    }
  }, [load, status]);

  if (!course) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base text-ink">
          {status === "loading" ? t("course.opening") : t("course.unavailable")}
        </Text>
      </View>
    );
  }

  const phoneUrl = course.phone ? `tel:${course.phone.replace(/[^\d+]/g, "")}` : null;
  const layouts = course.layouts;

  function startRound() {
    if (layouts.length === 1) {
      const layout = layouts[0];
      if (!layout) {
        return;
      }
      router.push({
        pathname: "/[id]/round",
        params: { id: String(id), layoutId: String(layout.id) },
      });
      return;
    }
    if (layouts.length > 1) {
      router.push({ pathname: "/[id]/play", params: { id: String(id) } });
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: course.name }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-5 px-4 py-6">
        {course.photoUri ? (
          <Image
            source={{ uri: course.photoUri }}
            contentFit="cover"
            style={{ width: "100%", height: 220, borderRadius: 24, borderCurve: "continuous" }}
          />
        ) : null}
        <View className="gap-1">
          <Text className="text-2xl font-semibold text-ink" selectable>
            {course.name}
          </Text>
          <Text className="text-base text-muted" selectable>
            {course.address}
          </Text>
        </View>
        {phoneUrl ? (
          <InfoRow label={t("common.phone")} value={course.phone ?? ""} onPress={() => void Linking.openURL(phoneUrl)} />
        ) : null}
        {course.website ? (
          <InfoRow
            label={t("common.website")}
            value={course.website}
            onPress={() => void WebBrowser.openBrowserAsync(websiteUrl(course.website ?? ""))}
          />
        ) : null}
        {course.description ? (
          <View className="gap-2">
            <Text className="text-sm text-muted">{t("common.about")}</Text>
            <Text className="text-base text-ink" selectable>
              {course.description}
            </Text>
          </View>
        ) : null}
        {settingsReady && developerMode ? (
          <Pressable
            onPress={() => router.push({ pathname: "/[id]/edit", params: { id: String(id) } })}
            className="items-center rounded-full border border-tint px-5 py-4"
          >
            <Text className="text-base font-semibold text-tint">{t("course.edit")}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={startRound} className="items-center rounded-full bg-tint px-5 py-4">
          <Text className="text-base font-semibold text-on-tint">{t("course.startRound")}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

function InfoRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="gap-1 rounded-2xl bg-card px-4 py-4">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-base text-tint" selectable>
        {value}
      </Text>
    </Pressable>
  );
}

function websiteUrl(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `https://${value}`;
}
