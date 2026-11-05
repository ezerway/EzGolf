import { Stack } from "expo-router/stack";

import { useT } from "@/i18n";
import { useNavigationTheme } from "@/theme";

export default function CourseLayout() {
  const navigationTheme = useNavigationTheme();
  const t = useT();
  return (
    <Stack
      screenOptions={{
        ...navigationTheme,
        headerLargeTitleEnabled: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: t("nav.course") }} />
      <Stack.Screen name="edit" options={{ title: t("nav.editClub") }} />
      <Stack.Screen name="layout/[layoutId]" options={{ title: t("nav.course") }} />
      <Stack.Screen name="layout/[layoutId]/hole/[holeId]" options={{ title: t("nav.hole") }} />
      <Stack.Screen name="play" options={{ title: t("nav.chooseCourse") }} />
      <Stack.Screen name="round" options={{ title: t("nav.round") }} />
    </Stack>
  );
}
