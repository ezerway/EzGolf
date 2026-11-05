import type { ViewStyle } from "react-native";

import type { Palette } from "@/theme";

export function buttonFace(palette: Palette, tone: "tint" | "card" | "surface" | "outline"): ViewStyle {
  return {
    backgroundColor:
      tone === "tint" ? palette.tint : tone === "surface" ? palette.background : palette.card,
    borderRadius: 24,
    overflow: "hidden",
    ...(tone === "outline" ? { borderWidth: 1.5, borderColor: palette.tint } : null),
  };
}

export function cardFace(palette: Palette): ViewStyle {
  return {
    backgroundColor: palette.card,
    borderRadius: 16,
    overflow: "hidden",
  };
}
