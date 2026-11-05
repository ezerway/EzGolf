import type { MessageKey } from "@/i18n";

export const teeKinds = ["tee-blue", "tee-white", "tee-yellow", "tee-red"] as const;

export type TeeKind = (typeof teeKinds)[number];

export const featureKinds = [...teeKinds, "green", "hole", "rough", "bunker", "hazard", "fringe"] as const;

export type FeatureKind = (typeof featureKinds)[number];

export const featureCatalog: Record<FeatureKind, { color: string; mark: string; ink: string }> = {
  "tee-blue": { color: "#2f6fed", mark: "T", ink: "#ffffff" },
  "tee-white": { color: "#f4f4f5", mark: "T", ink: "#25292e" },
  "tee-yellow": { color: "#ffd33d", mark: "T", ink: "#25292e" },
  "tee-red": { color: "#e23b3b", mark: "T", ink: "#ffffff" },
  green: { color: "#3dd68c", mark: "G", ink: "#25292e" },
  hole: { color: "#f4f4f5", mark: "H", ink: "#25292e" },
  rough: { color: "#6b8f71", mark: "R", ink: "#ffffff" },
  bunker: { color: "#e6c98a", mark: "B", ink: "#25292e" },
  hazard: { color: "#4aa3df", mark: "W", ink: "#25292e" },
  fringe: { color: "#b7e4c7", mark: "F", ink: "#25292e" },
};

export const featureLabelKey: Record<FeatureKind, MessageKey> = {
  "tee-blue": "feature.tee-blue",
  "tee-white": "feature.tee-white",
  "tee-yellow": "feature.tee-yellow",
  "tee-red": "feature.tee-red",
  green: "feature.green",
  hole: "feature.hole",
  rough: "feature.rough",
  bunker: "feature.bunker",
  hazard: "feature.hazard",
  fringe: "feature.fringe",
};

export function isTeeKind(kind: FeatureKind): kind is TeeKind {
  return (teeKinds as readonly string[]).includes(kind);
}

export function asFeatureKind(value: string): FeatureKind | null {
  if (value === "tee") {
    return "tee-yellow";
  }
  if (value === "tee-black") {
    return "tee-blue";
  }
  return (featureKinds as readonly string[]).includes(value) ? (value as FeatureKind) : null;
}
