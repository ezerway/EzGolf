import { translate, type AppLanguage } from "@/i18n";

export function formatPlayed(timestamp: number, language: AppLanguage) {
  const date = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startOfToday - startOfDate) / 86_400_000);
  const locale = language === "vi" ? "vi" : "en";
  const time = date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  if (days === 0) {
    return translate(language, "played.today", { time });
  }
  if (days === 1) {
    return translate(language, "played.yesterday", { time });
  }
  const day = date.toLocaleDateString(locale, { month: "short", day: "numeric" });
  return translate(language, "played.date", { day, time });
}
