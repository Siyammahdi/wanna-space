export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "ws-theme";

/** Pages that are always light, whatever the user's theme (the landing page). */
export const LIGHT_ONLY_PATHS = ["/"];

/**
 * Runs before first paint (inlined in <head>) so the page never flashes the
 * wrong theme. Must stay dependency-free and tiny.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);if(${JSON.stringify(LIGHT_ONLY_PATHS)}.indexOf(location.pathname)>-1)d=false;document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(preference: ThemePreference) {
  localStorage.setItem(THEME_STORAGE_KEY, preference);
  document.documentElement.dataset.theme = resolveTheme(preference);
}

export function readThemePreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}
