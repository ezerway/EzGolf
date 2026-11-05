import { Stack } from "expo-router/stack";

import { useT } from "@/i18n";
import { useNavigationTheme } from "@/theme";

export default function CoursesLayout() {
  const navigationTheme = useNavigationTheme();
  const t = useT();
  return (
    <Stack screenOptions={navigationTheme}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="add" options={{ title: t("nav.addClub"), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
