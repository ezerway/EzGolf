import "../../global.css";

import { useEffect, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import LottieView from "lottie-react-native";
import { colorScheme } from "nativewind";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useT } from "@/i18n";
import { useSettingsStore } from "@/stores/settings";
import { palettes, themeVars, usePalette, useScheme } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 350, fade: true });

export default function RootLayout() {
  const loadSettings = useSettingsStore((state) => state.load);
  const appearance = useSettingsStore((state) => state.appearance);
  const scheme = useScheme();
  const palette = usePalette();
  const t = useT();
  const [ready, setReady] = useState(false);
  const baseTheme = scheme === "dark" ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: palette.tint,
      background: palette.background,
      card: palette.background,
      text: palette.text,
      border: palette.background,
      notification: palette.tint,
    },
  };

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    colorScheme.set(appearance);
  }, [appearance]);

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (!cancelled) {
        setReady(true);
      }
    };
    void SplashScreen.hideAsync();
    const timer = setTimeout(finish, 1800);
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) {
        finish();
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palettes.dark.background }}>
        <LottieView
          source={require("../../assets/animations/launch.json")}
          autoPlay
          loop={false}
          onAnimationFinish={() => setReady(true)}
          style={{ width: 280, height: 280 }}
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={[{ flex: 1, backgroundColor: palette.background }, themeVars[scheme]]}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <NativeTabs
          tintColor={palette.tint}
          backgroundColor={palette.background}
          indicatorColor={palette.indicator}
          rippleColor={palette.ripple}
          iconColor={{ default: palette.text, selected: palette.tint }}
          labelStyle={{
            default: { color: palette.text },
            selected: { color: palette.tint },
          }}
          labelVisibilityMode="labeled"
          blurEffect="none"
          disableTransparentOnScrollEdge
        >
          <NativeTabs.Trigger name="(courses)">
            <NativeTabs.Trigger.Label>{t("tabs.courses")}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              sf={{ default: "flag", selected: "flag.fill" }}
              md="golf_course"
            />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="recent">
            <NativeTabs.Trigger.Label>{t("tabs.recent")}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              sf={{ default: "clock", selected: "clock.fill" }}
              md="history"
            />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="scorecard">
            <NativeTabs.Trigger.Label>{t("tabs.scorecard")}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              sf={{ default: "list.clipboard", selected: "list.clipboard.fill" }}
              md="scoreboard"
            />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="info">
            <NativeTabs.Trigger.Label>{t("tabs.info")}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              sf={{ default: "info.circle", selected: "info.circle.fill" }}
              md="info"
            />
          </NativeTabs.Trigger>
        </NativeTabs>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
