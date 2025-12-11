// SettingsStore.js
// Minimal localStorage persistence layer for font-maker settings.

const KEY = "fontmaker-settings";

export const SettingsStore = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return {};

      const data = JSON.parse(raw);

      // basic sanity check
      if (typeof data !== "object" || data === null) return {};

      return data;
    } catch {
      return {};
    }
  },

  save(payload) {
    try {
      const existing = SettingsStore.load();
      const merged = { ...existing, ...payload };
      localStorage.setItem(KEY, JSON.stringify(merged));
      return merged;
    } catch {
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }
};
