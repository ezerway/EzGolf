import { create } from "zustand";

import { getDatabase } from "@/stores/courses";

export type Appearance = "system" | "light" | "dark";
export type Language = "system" | "en" | "vi";

type SettingsState = {
  developerMode: boolean;
  appearance: Appearance;
  language: Language;
  ready: boolean;
  load: () => Promise<void>;
  setDeveloperMode: (enabled: boolean) => Promise<void>;
  setAppearance: (appearance: Appearance) => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  developerMode: false,
  appearance: "system",
  language: "system",
  ready: false,
  load: async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      "SELECT key, value FROM settings WHERE key IN ('developerMode', 'appearance', 'language')",
    );
    const values = new Map(rows.map((row) => [row.key, row.value]));
    set({
      developerMode: values.get("developerMode") === "1",
      appearance: asAppearance(values.get("appearance")),
      language: asLanguage(values.get("language")),
      ready: true,
    });
  },
  setDeveloperMode: async (enabled) => {
    await writeSetting("developerMode", enabled ? "1" : "0");
    set({ developerMode: enabled, ready: true });
  },
  setAppearance: async (appearance) => {
    await writeSetting("appearance", appearance);
    set({ appearance, ready: true });
  },
  setLanguage: async (language) => {
    await writeSetting("language", language);
    set({ language, ready: true });
  },
}));

async function writeSetting(key: string, value: string) {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value,
  );
}

function asAppearance(value: string | undefined): Appearance {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

function asLanguage(value: string | undefined): Language {
  if (value === "en" || value === "vi" || value === "system") {
    return value;
  }
  return "system";
}
