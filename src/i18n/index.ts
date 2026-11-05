import { useSettingsStore, type Language } from "@/stores/settings";

import { en, type MessageKey } from "./en";
import { vi } from "./vi";

export type { MessageKey } from "./en";
export type AppLanguage = "en" | "vi";
export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

const catalogs: Record<AppLanguage, Record<MessageKey, string>> = { en, vi };

export function systemLanguage(): AppLanguage {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
  return locale.startsWith("vi") ? "vi" : "en";
}

export function resolveLanguage(preference: Language): AppLanguage {
  return preference === "system" ? systemLanguage() : preference;
}

export function translate(language: AppLanguage, key: MessageKey, params?: Record<string, string | number>) {
  const template = catalogs[language][key];
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, token: string) => String(params[token] ?? ""));
}

export function useLanguage(): AppLanguage {
  const preference = useSettingsStore((state) => state.language);
  return resolveLanguage(preference);
}

export function useT(): Translate {
  const language = useLanguage();
  return (key, params) => translate(language, key, params);
}
