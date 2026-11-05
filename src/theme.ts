import { useColorScheme } from "react-native";
import { vars } from "nativewind";

import { useSettingsStore } from "@/stores/settings";

export type Scheme = "light" | "dark";

export type Palette = {
  background: string;
  text: string;
  muted: string;
  tint: string;
  card: string;
  indicator: string;
  ripple: string;
  onTint: string;
};

export const palettes: Record<Scheme, Palette> = {
  dark: {
    background: "#25292e",
    text: "#ffffff",
    muted: "#a1a1aa",
    tint: "#ffd33d",
    card: "#32383f",
    indicator: "rgba(255, 211, 61, 0.2)",
    ripple: "rgba(255, 211, 61, 0.3)",
    onTint: "#25292e",
  },
  light: {
    background: "#f4f5f7",
    text: "#18181b",
    muted: "#71717a",
    tint: "#ffd33d",
    card: "#ffffff",
    indicator: "rgba(255, 211, 61, 0.45)",
    ripple: "rgba(224, 176, 0, 0.28)",
    onTint: "#25292e",
  },
};

function schemeVars(palette: Palette) {
  return vars({
    "--color-background": palette.background,
    "--color-ink": palette.text,
    "--color-muted": palette.muted,
    "--color-tint": palette.tint,
    "--color-card": palette.card,
    "--color-on-tint": palette.onTint,
  });
}

export const themeVars: Record<Scheme, ReturnType<typeof vars>> = {
  dark: schemeVars(palettes.dark),
  light: schemeVars(palettes.light),
};

export function useScheme(): Scheme {
  const appearance = useSettingsStore((state) => state.appearance);
  const system = useColorScheme();
  if (appearance === "light" || appearance === "dark") {
    return appearance;
  }
  return system === "light" ? "light" : "dark";
}

export function usePalette() {
  return palettes[useScheme()];
}

export function useNavigationTheme() {
  const palette = usePalette();
  return {
    headerStyle: { backgroundColor: palette.background },
    headerTintColor: palette.text,
    headerTitleStyle: { color: palette.text },
    headerShadowVisible: false,
    headerLargeStyle: { backgroundColor: palette.background },
    headerLargeTitleStyle: { color: palette.text },
    contentStyle: { backgroundColor: palette.background },
  };
}
