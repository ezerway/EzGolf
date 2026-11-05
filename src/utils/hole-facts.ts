import type { Translate } from "@/i18n";

export function holeFacts(hole: { par: number | null; strokeIndex: number | null }, t: Translate) {
  const parts: string[] = [];
  if (hole.par != null) {
    parts.push(t("hole.factsPar", { n: hole.par }));
  }
  if (hole.strokeIndex != null) {
    parts.push(t("hole.factsIndex", { n: hole.strokeIndex }));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function formatHoleCount(count: number, t: Translate) {
  if (count === 0) {
    return t("play.noHoles");
  }
  if (count === 1) {
    return t("play.oneHole");
  }
  return t("play.manyHoles", { count });
}
