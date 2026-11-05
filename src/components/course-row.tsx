import { Image } from "expo-image";
import { Alert, Pressable, Text, View } from "react-native";

import { useT } from "@/i18n";
import type { Course } from "@/stores/courses";

export function CourseRow({
  course,
  distance,
  onOpen,
  onRemove,
}: {
  course: Course;
  distance?: string | null;
  onOpen: (id: number) => void;
  onRemove?: (id: number) => void;
}) {
  const t = useT();
  const layoutNames = course.layouts.map((layout) => layout.name);
  const layoutLabel =
    layoutNames.length > 1 || (layoutNames[0] != null && layoutNames[0] !== course.name)
      ? layoutNames.join(" · ")
      : null;
  return (
    <Pressable
      onPress={() => onOpen(course.id)}
      className="mx-4 mb-3 flex-row gap-3 rounded-2xl bg-card p-3"
      style={{ borderCurve: "continuous" }}
    >
      {course.photoUri ? (
        <Image
          source={{ uri: course.photoUri }}
          contentFit="cover"
          style={{
            width: 96,
            height: 96,
            borderRadius: 16,
            borderCurve: "continuous",
            backgroundColor: "#25292e",
          }}
        />
      ) : (
        <View className="h-24 w-24 items-center justify-center rounded-2xl bg-background">
          <Text className="text-2xl font-semibold text-tint">{course.name.slice(0, 1)}</Text>
        </View>
      )}
      <View className="flex-1 justify-center gap-1">
        <Text className="text-base font-semibold text-ink" numberOfLines={2} selectable>
          {course.name}
        </Text>
        <Text className="text-sm text-muted" numberOfLines={2} selectable>
          {course.address}
        </Text>
        {distance ? <Text className="text-sm font-semibold text-tint">{distance}</Text> : null}
        {onRemove ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              Alert.alert(t("course.removeTitle"), t("course.removeBody", { name: course.name }), [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("common.remove"),
                  style: "destructive",
                  onPress: () => onRemove(course.id),
                },
              ]);
            }}
            hitSlop={8}
          >
            <Text className="text-sm text-tint">{t("common.remove")}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
