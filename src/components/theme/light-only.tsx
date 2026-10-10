"use client";

import { useEffect } from "react";

import { readThemePreference, resolveTheme } from "@/lib/theme";

/**
 * Keeps the whole document light while mounted, and hands the user's theme back on
 * the way out. The first paint is already light (`LIGHT_ONLY_PATHS` in lib/theme);
 * this covers client-side navigation in and out.
 */
export function LightOnly() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = "light";
    return () => {
      root.dataset.theme = resolveTheme(readThemePreference());
    };
  }, []);
  return null;
}
