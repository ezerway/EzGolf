import { useState } from "react";
import { Linking, Pressable, ScrollView, Switch, Text, View } from "react-native";
import Constants from "expo-constants";
import * as StoreReview from "expo-store-review";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { buttonFace, cardFace } from "@/components/button-face";
import { useT } from "@/i18n";
import { useSettingsStore, type Appearance, type Language } from "@/stores/settings";
import { themeVars, usePalette, useScheme } from "@/theme";
import { appInfo } from "@/utils/app-info";

export function InfoScreen() {
  const developerMode = useSettingsStore((state) => state.developerMode);
  const setDeveloperMode = useSettingsStore((state) => state.setDeveloperMode);
  const appearance = useSettingsStore((state) => state.appearance);
  const setAppearance = useSettingsStore((state) => state.setAppearance);
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const scheme = useScheme();
  const palette = usePalette();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<string | null>(null);
  const version = Constants.expoConfig?.version ?? "1.0.0";

  async function rate() {
    setNotice(null);
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
        return;
      }
      await openStore();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t("info.storeFailed"));
    }
  }

  return (
    <View className="flex-1 bg-background" style={themeVars[scheme]}>
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-4 px-4 py-6"
      contentContainerStyle={process.env.EXPO_OS === "android" ? { paddingTop: insets.top + 12 } : undefined}
    >
      <View className="gap-1">
        <Text
          className={process.env.EXPO_OS === "android" ? "text-2xl font-semibold" : "text-3xl font-semibold"}
          style={{ color: palette.text }}
        >
          {appInfo.name}
        </Text>
        <Text className="text-base" style={{ color: palette.muted }}>{t("info.version", { version })}</Text>
      </View>
      <InfoRow label={t("info.developer")} value={appInfo.developer} />
      <Pressable
        onPress={() => void openStore().catch(() => setNotice(t("info.storeFailed")))}
        className="gap-1 px-4 py-4"
        style={cardFace(palette)}
      >
        <Text className="text-sm" style={{ color: palette.muted }}>{t("info.store")}</Text>
        <Text className="text-base" style={{ color: palette.tint }}>{t("info.viewStore", { name: appInfo.name })}</Text>
      </Pressable>
      <Pressable onPress={() => void rate()} className="items-center px-5 py-4" style={buttonFace(palette, "tint")}>
        <Text className="text-base font-semibold text-on-tint">{t("info.rate", { name: appInfo.name })}</Text>
      </Pressable>
      <ChoiceRow
        label={t("info.appearance")}
        hint={t("info.appearanceHint")}
        value={appearance}
        onChange={(value) => void setAppearance(value)}
        options={[
          { label: t("info.system"), value: "system" },
          { label: t("info.light"), value: "light" },
          { label: t("info.dark"), value: "dark" },
        ]}
      />
      <ChoiceRow
        label={t("info.language")}
        hint={t("info.languageHint")}
        value={language}
        onChange={(value) => void setLanguage(value)}
        options={[
          { label: t("info.system"), value: "system" },
          { label: t("info.english"), value: "en" },
          { label: t("info.vietnamese"), value: "vi" },
        ]}
      />
      <View className="flex-row items-center justify-between px-4 py-4" style={cardFace(palette)}>
        <View className="flex-1 gap-1 pr-4">
          <Text className="text-base" style={{ color: palette.text }}>{t("info.developerMode")}</Text>
          <Text className="text-sm" style={{ color: palette.muted }}>{t("info.developerModeHint")}</Text>
        </View>
        <Switch
          value={developerMode}
          onValueChange={(value) => void setDeveloperMode(value)}
          trackColor={{ false: scheme === "dark" ? "#3f3f46" : "#d4d4d8", true: palette.tint }}
          thumbColor={palette.onTint}
        />
      </View>
      {notice ? (
        <Text className="text-sm" style={{ color: palette.tint }} selectable>
          {notice}
        </Text>
      ) : null}
    </ScrollView>
    </View>
  );
}

function ChoiceRow<T extends Appearance | Language>({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string;
  hint: string;
  value: T;
  onChange: (value: T) => void;
  options: { label: string; value: T }[];
}) {
  const palette = usePalette();
  return (
    <View className="gap-3 px-4 py-4" style={cardFace(palette)}>
      <View className="gap-1">
        <Text className="text-base" style={{ color: palette.text }}>{label}</Text>
        <Text className="text-sm" style={{ color: palette.muted }}>{hint}</Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              className="min-h-11 min-w-[30%] flex-1 items-center justify-center px-3 py-2"
              style={buttonFace(palette, selected ? "tint" : "surface")}
            >
              <Text
                className="text-center text-sm font-semibold"
                style={{ color: selected ? palette.onTint : palette.text }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const palette = usePalette();
  return (
    <View className="gap-1 px-4 py-4" style={cardFace(palette)}>
      <Text className="text-sm" style={{ color: palette.muted }}>{label}</Text>
      <Text className="text-base" style={{ color: palette.text }} selectable>
        {value}
      </Text>
    </View>
  );
}

async function openStore() {
  if (process.env.EXPO_OS === "android") {
    const marketUrl = `market://details?id=${appInfo.androidPackage}`;
    const webUrl = `https://play.google.com/store/apps/details?id=${appInfo.androidPackage}`;
    await Linking.openURL((await Linking.canOpenURL(marketUrl)) ? marketUrl : webUrl);
    return;
  }
  const lookup = await fetch(`https://itunes.apple.com/lookup?bundleId=${appInfo.iosBundleId}`);
  const body = (await lookup.json()) as { results?: { trackViewUrl?: string }[] };
  const storeUrl = body.results?.[0]?.trackViewUrl;
  if (storeUrl) {
    await Linking.openURL(storeUrl);
    return;
  }
  if (await StoreReview.hasAction()) {
    await StoreReview.requestReview();
  }
}
