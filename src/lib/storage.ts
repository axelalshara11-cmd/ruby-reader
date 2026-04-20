import type { ListItem } from "@/types/card";

const STORAGE_KEY = "cards_v1";
const SETTINGS_KEY = "cards_settings_v1";

export interface AppSettings {
  delayMs: number;
}

export const defaultSettings: AppSettings = { delayMs: 500 };

export function loadItems(): ListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ListItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveItems(items: ListItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("LocalStorage save failed", e);
  }
}

export function clearItems() {
  localStorage.removeItem(STORAGE_KEY);
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
